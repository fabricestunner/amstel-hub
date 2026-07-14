import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateOutletDto,
  ListOutletsDto,
  OutletVouchersQueryDto,
  RedemptionHistoryQueryDto,
  UpdateOutletDto,
} from './dto/outlet.dto';

const GEO_INCLUDE = {
  region: { select: { id: true, name: true } },
  province: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
} satisfies Prisma.OutletInclude;

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListOutletsDto, user: AuthenticatedUser) {
    const where: Prisma.OutletWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Scope reads: REGIONAL_MANAGER sees only their region; OUTLET_MANAGER
    // only their own outlet. SUPER_ADMIN / CAMPAIGN_MANAGER see everything.
    if (user.role === 'REGIONAL_MANAGER') {
      where.regionId = user.regionId ?? '__none__';
    } else if (user.role === 'OUTLET_MANAGER') {
      where.id = user.outletId ?? '__none__';
    }

    const [items, total] = await Promise.all([
      this.prisma.outlet.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: GEO_INCLUDE,
      }),
      this.prisma.outlet.count({ where }),
    ]);
    return paginate(items.map((o) => this.serialize(o)), total, query);
  }

  async findById(id: string, user: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      include: GEO_INCLUDE,
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);
    return this.serialize(outlet);
  }

  async create(dto: CreateOutletDto) {
    try {
      const outlet = await this.prisma.outlet.create({
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          regionId: dto.regionId,
          provinceId: dto.provinceId,
          districtId: dto.districtId,
          managerId: dto.managerId,
        },
        include: GEO_INCLUDE,
      });
      return this.serialize(outlet);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async update(id: string, dto: UpdateOutletDto) {
    await this.ensureExists(id);
    const data: Prisma.OutletUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.regionId !== undefined
        ? { region: { connect: { id: dto.regionId } } }
        : {}),
      ...(dto.provinceId !== undefined
        ? { province: { connect: { id: dto.provinceId } } }
        : {}),
      ...(dto.districtId !== undefined
        ? { district: { connect: { id: dto.districtId } } }
        : {}),
      ...(dto.managerId !== undefined
        ? { manager: { connect: { id: dto.managerId } } }
        : {}),
    };
    try {
      const outlet = await this.prisma.outlet.update({
        where: { id },
        data,
        include: GEO_INCLUDE,
      });
      return this.serialize(outlet);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async softDelete(id: string) {
    await this.ensureExists(id);
    await this.prisma.outlet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /** Aggregated KPIs for a single outlet. */
  async dashboard(id: string, user: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);

    const [
      redemptionAgg,
      customersRegistered,
      tournamentEntries,
      recentCustomers,
    ] = await Promise.all([
      // Points generated at this outlet is the sum of points from every code
      // redeemed here — derived live so it always reflects real redemptions
      // rather than a denormalized counter that is never updated.
      this.prisma.codeRedemption.aggregate({
        where: { outletId: id },
        _sum: { points: true },
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: { registeredOutletId: id, deletedAt: null },
      }),
      this.prisma.tournamentRegistration.count({
        where: { user: { registeredOutletId: id } },
      }),
      this.prisma.user.findMany({
        where: { registeredOutletId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          wallet: { select: { availablePoints: true } },
        },
      }),
    ]);

    return {
      outletId: outlet.id,
      name: outlet.name,
      nationalRank: outlet.nationalRank,
      regionalRank: outlet.regionalRank,
      campaignSales: Number(outlet.totalSales),
      pointsGenerated: redemptionAgg._sum.points ?? 0,
      redemptionsCount: redemptionAgg._count._all,
      customersRegistered,
      tournamentEntries,
      recentCustomers: recentCustomers.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.id,
        points: c.wallet ? Number(c.wallet.availablePoints) : 0,
        joinedAt: c.createdAt.toISOString(),
      })),
    };
  }

  /** Paginated history of every code a customer redeemed at this outlet. */
  async redemptionHistory(
    id: string,
    query: RedemptionHistoryQueryDto,
    user: AuthenticatedUser,
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, regionId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);

    const where: Prisma.CodeRedemptionWhereInput = {
      outletId: id,
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.codeRedemption.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          code: { select: { type: true, campaign: { select: { name: true } } } },
        },
      }),
      this.prisma.codeRedemption.count({ where }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      customerId: r.userId,
      customerName: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.email || r.user.phone,
      codeType: r.code.type,
      campaign: r.code.campaign?.name,
      points: r.points,
      redeemedAt: r.createdAt.toISOString(),
    }));

    return paginate(mapped, total, query);
  }

  /**
   * Paginated list of vouchers (loyalty codes) generated for this outlet, plus
   * status counts. The raw code is never stored in plaintext, so we return a
   * short reference derived from the id rather than the code itself.
   */
  async listVouchers(
    id: string,
    query: OutletVouchersQueryDto,
    user: AuthenticatedUser,
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, regionId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);

    const where: Prisma.LoyaltyCodeWhereInput = {
      outletId: id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, byStatus] = await Promise.all([
      this.prisma.loyaltyCode.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        select: {
          id: true,
          type: true,
          status: true,
          pointsValue: true,
          batchId: true,
          expiresAt: true,
          createdAt: true,
          campaign: { select: { name: true } },
          redemption: {
            select: {
              createdAt: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.loyaltyCode.count({ where }),
      this.prisma.loyaltyCode.groupBy({
        by: ['status'],
        where: { outletId: id },
        _count: { _all: true },
      }),
    ]);

    const counts = byStatus.reduce(
      (acc, row) => {
        acc.total += row._count._all;
        if (row.status === 'REDEEMED') acc.redeemed += row._count._all;
        if (row.status === 'ACTIVE') acc.active += row._count._all;
        return acc;
      },
      { total: 0, active: 0, redeemed: 0 },
    );

    const mapped = items.map((c) => ({
      id: c.id,
      reference: `VCH-${c.id.slice(0, 8).toUpperCase()}`,
      type: c.type,
      status: c.status,
      points: c.pointsValue,
      campaign: c.campaign?.name,
      batchId: c.batchId,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      redeemedAt: c.redemption?.createdAt.toISOString() ?? null,
      redeemedBy: c.redemption
        ? [c.redemption.user.firstName, c.redemption.user.lastName]
            .filter(Boolean)
            .join(' ') || null
        : null,
    }));

    return { ...paginate(mapped, total, query), counts };
  }

  async listRegions() {
    return this.prisma.region.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async listProvinces(regionId?: string) {
    return this.prisma.province.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, regionId: true },
    });
  }

  async listDistricts(provinceId?: string) {
    return this.prisma.district.findMany({
      where: provinceId ? { provinceId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, provinceId: true },
    });
  }

  /**
   * Returns distinct outlets where a customer has previously scanned codes.
   * Used for tournament registration outlet selection.
   */
  async listCustomerOutlets(userId: string) {
    const redemptions = await this.prisma.codeRedemption.findMany({
      where: { userId },
      select: { outletId: true },
      distinct: ['outletId'],
    });
    const outletIds = redemptions.map((r) => r.outletId).filter(Boolean) as string[];
    if (outletIds.length === 0) return [];

    const outlets = await this.prisma.outlet.findMany({
      where: { id: { in: outletIds }, deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    return outlets;
  }

  /**
   * Turns the Prisma write errors this endpoint can actually provoke into
   * user-facing 4xx. Without this they surface as an opaque 500: `code` and
   * `managerId` are both unique, and the geo ids arrive straight from the
   * client so they can reference rows that no longer exist.
   */
  private mapWriteError(err: unknown): unknown {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return err;

    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[])
        : [];
      if (target.includes('managerId')) {
        return new ConflictException(
          'That manager already runs another outlet',
        );
      }
      return new ConflictException('An outlet with this code already exists');
    }
    if (err.code === 'P2003' || err.code === 'P2025') {
      return new BadRequestException(
        'Unknown region, province, district or manager',
      );
    }
    return err;
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Outlet not found');
  }

  private assertReadScope(
    outletId: string,
    regionId: string,
    user: AuthenticatedUser,
  ): void {
    if (user.role === 'SUPER_ADMIN' || user.role === 'CAMPAIGN_MANAGER') return;
    if (user.role === 'REGIONAL_MANAGER' && user.regionId === regionId) return;
    if (user.role === 'OUTLET_MANAGER' && user.outletId === outletId) return;
    throw new ForbiddenException('Outlet outside your scope');
  }

  private serialize(outlet: {
    totalPoints: bigint;
    totalSales: Prisma.Decimal;
    customerCount: number;
    status: string;
    region?: { id: string; name: string } | null;
    province?: { id: string; name: string } | null;
    district?: { id: string; name: string } | null;
    [k: string]: unknown;
  }) {
    const { region, province, district, totalPoints, totalSales, customerCount, status, ...rest } = outlet;
    return {
      ...rest,
      region: region?.name ?? null,
      province: province?.name ?? null,
      district: district?.name ?? null,
      status: status.toLowerCase(),
      pointsGenerated: Number(totalPoints),
      customers: customerCount,
    };
  }
}
