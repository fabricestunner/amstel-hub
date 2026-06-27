import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaderboardType } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  CustomerLeaderboardQuery,
  OutletLeaderboardQuery,
} from './dto/leaderboard.dto';

const PAGE_SIZE = 50;

@Injectable()
export class LeaderboardsService {
  private readonly logger = new Logger(LeaderboardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async customers(query: CustomerLeaderboardQuery) {
    const period = query.period ?? this.defaultPeriod(query.type);
    return this.read(query.type, period, query.page);
  }

  async outlets(query: OutletLeaderboardQuery) {
    const period = query.period ?? 'ALL';
    const regionId =
      query.type === 'OUTLET_REGIONAL' ? query.regionId : undefined;
    return this.read(query.type, period, query.page, regionId);
  }

  private async read(
    type: LeaderboardType,
    period: string,
    page: number,
    regionId?: string,
  ) {
    const cacheKey = `lb:${type}:${period}:${page}:${regionId ?? '-'}`;
    const cached = await this.redis.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.leaderboardEntry.findMany({
      where: { type, period, ...(regionId ? { regionId } : {}) },
      orderBy: { rank: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { outlet: { select: { id: true, name: true } } },
    });
    const result = rows.map((r) => ({
      rank: r.rank,
      score: Number(r.score),
      userId: r.userId,
      outletId: r.outletId,
      outlet: r.outlet,
      regionId: r.regionId,
      campaignId: r.campaignId,
    }));
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  /** Recompute all snapshot types. Invoked hourly and on demand. */
  @Cron('0 * * * *')
  async recompute(): Promise<void> {
    this.logger.log('Recomputing leaderboard snapshots');
    await Promise.all([
      this.recomputeCustomerLifetime(),
      this.recomputeCustomerMonthly(),
      this.recomputeOutletNational(),
      this.recomputeOutletRegional(),
    ]);
    this.logger.log('Leaderboard recompute complete');
  }

  private async recomputeCustomerLifetime(): Promise<void> {
    const wallets = await this.prisma.wallet.findMany({
      orderBy: { lifetimePoints: 'desc' },
      select: { userId: true, lifetimePoints: true },
    });
    await this.upsertRanked(
      'CUSTOMER_LIFETIME',
      'ALL',
      wallets.map((w) => ({
        score: w.lifetimePoints,
        userId: w.userId,
      })),
    );
  }

  private async recomputeCustomerMonthly(): Promise<void> {
    const period = this.currentMonth();
    const { start, end } = this.monthBounds(period);
    // Sum EARN points per user within the current calendar month.
    const grouped = await this.prisma.pointsTransaction.groupBy({
      by: ['userId'],
      where: {
        type: 'EARN',
        status: 'COMPLETED',
        createdAt: { gte: start, lt: end },
      },
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });
    await this.upsertRanked(
      'CUSTOMER_MONTHLY',
      period,
      grouped.map((g) => ({
        score: BigInt(g._sum.points ?? 0),
        userId: g.userId,
      })),
    );
  }

  private async recomputeOutletNational(): Promise<void> {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, totalPoints: true, regionId: true },
    });
    await this.upsertRanked(
      'OUTLET_NATIONAL',
      'ALL',
      outlets.map((o) => ({ score: o.totalPoints, outletId: o.id })),
    );
  }

  private async recomputeOutletRegional(): Promise<void> {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
      orderBy: [{ regionId: 'asc' }, { totalPoints: 'desc' }],
      select: { id: true, totalPoints: true, regionId: true },
    });
    // Rank within each region independently.
    const byRegion = new Map<string, typeof outlets>();
    for (const o of outlets) {
      const list = byRegion.get(o.regionId) ?? [];
      list.push(o);
      byRegion.set(o.regionId, list);
    }
    for (const [regionId, list] of byRegion) {
      await this.upsertRanked(
        'OUTLET_REGIONAL',
        'ALL',
        list.map((o) => ({
          score: o.totalPoints,
          outletId: o.id,
          regionId,
        })),
      );
    }
  }

  /**
   * Replace a ranked snapshot for one (type, period). We delete the slice and
   * re-insert rather than upsert: the unique key spans nullable columns
   * (userId/outletId/campaignId), and in SQL NULLs are never equal — so an
   * upsert on it could not reliably dedupe. Delete-then-insert is also faster
   * for a full recompute. Runs atomically.
   */
  private async upsertRanked(
    type: LeaderboardType,
    period: string,
    subjects: Array<{
      score: bigint;
      userId?: string;
      outletId?: string;
      regionId?: string;
      campaignId?: string;
    }>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.leaderboardEntry.deleteMany({ where: { type, period } }),
      this.prisma.leaderboardEntry.createMany({
        data: subjects.map((s, i) => ({
          type,
          period,
          rank: i + 1,
          score: s.score,
          userId: s.userId,
          outletId: s.outletId,
          regionId: s.regionId,
          campaignId: s.campaignId,
        })),
      }),
    ]);
  }

  private defaultPeriod(type: LeaderboardType): string {
    return type === 'CUSTOMER_MONTHLY' ? this.currentMonth() : 'ALL';
  }

  private currentMonth(): string {
    const now = new Date();
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}`;
  }

  private monthBounds(period: string): { start: Date; end: Date } {
    const [year, month] = period.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }
}
