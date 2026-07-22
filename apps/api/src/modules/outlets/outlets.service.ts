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
import { RedisService } from '../../common/redis/redis.service';
import {
  CreateOutletDto,
  ListOutletsDto,
  OutletCustomerLeaderboardQueryDto,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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

    const stats = await this.redemptionStats(items.map((o) => o.id));
    return paginate(
      items.map((o) => this.serialize(o, stats.get(o.id))),
      total,
      query,
    );
  }

  /**
   * Live per-outlet totals derived from code redemptions: sum of points earned
   * at the outlet plus the number of distinct customers who earned them.
   * `Outlet.totalPoints` is now incremented in step by
   * `LoyaltyService.redeemCode` (and can be rebuilt via the backfill script),
   * but we still aggregate live here rather than reading the column: the live
   * aggregate is authoritative and self-healing, independent of whether the
   * backfill has ever run. `Outlet.customerCount` is still never written, so
   * `customers` below is always derived from this aggregation.
   * Two grouped queries for the whole page of outlets — no N+1.
   */
  private async redemptionStats(
    outletIds: string[],
  ): Promise<Map<string, { points: number; customers: number; scans: number }>> {
    const stats = new Map<
      string,
      { points: number; customers: number; scans: number }
    >();
    if (outletIds.length === 0) return stats;

    const [pointsGroups, customerGroups] = await Promise.all([
      this.prisma.codeRedemption.groupBy({
        by: ['outletId'],
        where: { outletId: { in: outletIds } },
        _sum: { points: true },
        _count: { _all: true },
      }),
      this.prisma.codeRedemption.groupBy({
        by: ['outletId', 'userId'],
        where: { outletId: { in: outletIds } },
      }),
    ]);

    for (const g of pointsGroups) {
      if (!g.outletId) continue;
      stats.set(g.outletId, {
        points: g._sum.points ?? 0,
        customers: 0,
        scans: g._count._all,
      });
    }
    // Each (outletId, userId) group is one distinct customer at that outlet.
    for (const g of customerGroups) {
      if (!g.outletId) continue;
      const entry = stats.get(g.outletId) ?? {
        points: 0,
        customers: 0,
        scans: 0,
      };
      entry.customers += 1;
      stats.set(g.outletId, entry);
    }
    return stats;
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
      campaignGroups,
      rewardRedemptionAgg,
      recentRewards,
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
      // Per-campaign sales at this outlet: every EARN transaction is one
      // scanned code (one bottle), summarised per campaign — the same
      // aggregation the outlet "Sales summary" CSV uses.
      this.prisma.pointsTransaction.groupBy({
        by: ['campaignId'],
        where: { outletId: id, type: 'EARN' },
        _count: { _all: true },
        _sum: { points: true },
      }),
      // Points customers spent redeeming rewards collected at this outlet.
      this.prisma.rewardRedemption.aggregate({
        where: {
          collectionOutletId: id,
          status: { in: ['APPROVED', 'FULFILLED'] },
        },
        _sum: { pointsSpent: true },
        _count: { _all: true },
      }),
      this.prisma.rewardRedemption.findMany({
        where: {
          collectionOutletId: id,
          status: { in: ['APPROVED', 'FULFILLED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          pointsSpent: true,
          status: true,
          createdAt: true,
          reward: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const campaignIds = campaignGroups
      .map((g) => g.campaignId)
      .filter((cid): cid is string => Boolean(cid));
    const campaigns = campaignIds.length
      ? await this.prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, name: true },
        })
      : [];
    const campaignNames = new Map(campaigns.map((c) => [c.id, c.name]));

    const campaignPerformance = campaignGroups
      .map((g) => ({
        campaignId: g.campaignId,
        campaign: g.campaignId
          ? (campaignNames.get(g.campaignId) ?? g.campaignId)
          : 'Unattributed',
        redemptions: g._count._all,
        points: g._sum.points ?? 0,
      }))
      .sort((a, b) => b.points - a.points);

    return {
      outletId: outlet.id,
      name: outlet.name,
      regionId: outlet.regionId,
      nationalRank: outlet.nationalRank,
      regionalRank: outlet.regionalRank,
      availablePoints: Number(outlet.availablePoints),
      campaignSales: Number(outlet.totalSales),
      pointsGenerated: redemptionAgg._sum.points ?? 0,
      redemptionsCount: redemptionAgg._count._all,
      crates: Math.floor(redemptionAgg._count._all / 24),
      customersRegistered,
      tournamentEntries,
      campaignPerformance,
      pointsRedeemed: rewardRedemptionAgg._sum.pointsSpent ?? 0,
      rewardsEarned: rewardRedemptionAgg._count._all,
      recentRewards: recentRewards.map((r) => ({
        id: r.id,
        rewardName: r.reward?.name ?? '—',
        customerName: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || '—',
        pointsSpent: r.pointsSpent,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      recentCustomers: recentCustomers.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.id,
        points: c.wallet ? Number(c.wallet.availablePoints) : 0,
        joinedAt: c.createdAt.toISOString(),
      })),
    };
  }

  private static readonly CUSTOMER_LEADERBOARD_PAGE_SIZE = 50;

  /**
   * Top customers registered at this outlet, ranked by points. Live query
   * (not the LeaderboardEntry snapshot table): this is outlet-scoped data
   * only that outlet's manager (or an admin) ever looks at, so a 60s cache
   * is enough — mirrors the pattern in leaderboards.service.ts.
   */
  async customerLeaderboard(
    id: string,
    query: OutletCustomerLeaderboardQueryDto,
    user: AuthenticatedUser,
  ): Promise<Array<{ rank: number; id: string; name: string; points: number }>> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, deletedAt: null },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    this.assertReadScope(outlet.id, outlet.regionId, user);

    const page = query.page ?? 1;
    const pageSize = OutletsService.CUSTOMER_LEADERBOARD_PAGE_SIZE;
    const cacheKey = `outlet-customer-lb:${id}:${query.period}:${page}`;
    const cached = await this.redis.get<
      Array<{ rank: number; id: string; name: string; points: number }>
    >(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * pageSize;
    let result: Array<{ rank: number; id: string; name: string; points: number }>;

    if (query.period === 'lifetime') {
      const users = await this.prisma.user.findMany({
        where: { registeredOutletId: id, deletedAt: null },
        orderBy: { wallet: { lifetimePoints: 'desc' } },
        skip,
        take: pageSize,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          wallet: { select: { lifetimePoints: true } },
        },
      });
      result = users.map((u, i) => ({
        rank: skip + i + 1,
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.id,
        points: Number(u.wallet?.lifetimePoints ?? 0n),
      }));
    } else {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const grouped = await this.prisma.pointsTransaction.groupBy({
        by: ['userId'],
        where: {
          type: 'EARN',
          status: 'COMPLETED',
          createdAt: { gte: start, lt: end },
          user: { registeredOutletId: id, deletedAt: null },
        },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        skip,
        take: pageSize,
      });
      const users = grouped.length
        ? await this.prisma.user.findMany({
            where: { id: { in: grouped.map((g) => g.userId) } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
      const byId = new Map(users.map((u) => [u.id, u]));
      result = grouped.map((g, i) => {
        const u = byId.get(g.userId);
        const name = u
          ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.id
          : g.userId;
        return { rank: skip + i + 1, id: g.userId, name, points: g._sum.points ?? 0 };
      });
    }

    await this.redis.set(cacheKey, result, 60);
    return result;
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

  private serialize(
    outlet: {
      totalPoints: bigint;
      availablePoints: bigint;
      totalSales: Prisma.Decimal;
      customerCount: number;
      status: string;
      region?: { id: string; name: string } | null;
      province?: { id: string; name: string } | null;
      district?: { id: string; name: string } | null;
      [k: string]: unknown;
    },
    stats?: { points: number; customers: number; scans: number },
  ) {
    const { region, province, district, totalPoints, availablePoints, totalSales, customerCount, status, ...rest } = outlet;
    return {
      ...rest,
      region: region?.name ?? null,
      province: province?.name ?? null,
      district: district?.name ?? null,
      status: status.toLowerCase(),
      availablePoints: Number(availablePoints ?? 0n),
      // Prefer live redemption-derived stats for the earned/generated total
      // and customer count. `totalPoints` is now kept in sync by
      // LoyaltyService.redeemCode (and by the backfill script), but the live
      // aggregate is still authoritative and self-healing here since it
      // doesn't depend on the backfill having run; `customerCount` is still
      // never written, so it stays at 0 whenever `stats` isn't available.
      pointsGenerated: stats ? stats.points : Number(totalPoints),
      customers: stats ? stats.customers : customerCount,
      crates: stats ? Math.floor(stats.scans / 24) : 0,
    };
  }
}
