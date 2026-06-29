import {
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
  UpdateOutletDto,
} from './dto/outlet.dto';

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
        include: {
          region: { select: { id: true, name: true } },
          province: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
        },
      }),
      this.prisma.outlet.count({ where }),
    ]);
    return paginate(items.map((o) => this.serialize(o)), total, query);
  }

  async findById(id: string, user: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      include: {
        region: { select: { id: true, name: true } },
        province: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
      },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);
    return this.serialize(outlet);
  }

  async create(dto: CreateOutletDto) {
    return this.prisma.outlet.create({
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
    });
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
    return this.prisma.outlet.update({ where: { id }, data });
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

    const [codeRedemptions, tournamentEntries, recentCustomers] = await Promise.all([
      this.prisma.codeRedemption.count({ where: { outletId: id } }),
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
      pointsGenerated: Number(outlet.totalPoints),
      customersRegistered: outlet.customerCount,
      tournamentEntries,
      recentCustomers: recentCustomers.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.id,
        points: c.wallet ? Number(c.wallet.availablePoints) : 0,
        joinedAt: c.createdAt.toISOString(),
      })),
    };
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
