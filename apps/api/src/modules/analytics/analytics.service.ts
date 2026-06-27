import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

interface DailyBucket {
  day: string;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Headline KPIs for the admin dashboard, scoped for regional managers. */
  async overview(user: AuthenticatedUser) {
    const regionId =
      user.role === 'REGIONAL_MANAGER' ? user.regionId : undefined;

    // User scoping: customers belong to a region via their registered outlet.
    const userScope: Prisma.UserWhereInput = regionId
      ? { registeredOutletId: { not: null }, customersAtOutlet: { regionId } }
      : {};
    const txScope: Prisma.PointsTransactionWhereInput = regionId
      ? { outlet: { regionId } }
      : {};

    const [
      activeUsers,
      pointsIssuedAgg,
      pointsRedeemedAgg,
      rewardRedemptions,
      tournamentCount,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { status: 'ACTIVE', deletedAt: null, ...userScope },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: { type: 'EARN', status: 'COMPLETED', ...txScope },
        _sum: { points: true },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: { type: 'REDEEM', status: 'COMPLETED', ...txScope },
        _sum: { points: true },
      }),
      this.prisma.rewardRedemption.count(),
      this.prisma.tournament.count({ where: { deletedAt: null } }),
    ]);

    const dailyRegistrations = await this.dailyRegistrations(14, regionId);
    const [topRegions, topOutlets, topCustomers] = await Promise.all([
      this.topRegions(regionId),
      this.topOutlets(regionId),
      this.topCustomers(),
    ]);

    return {
      activeUsers,
      dailyRegistrations,
      pointsIssued: pointsIssuedAgg._sum.points ?? 0,
      pointsRedeemed: Math.abs(pointsRedeemedAgg._sum.points ?? 0),
      rewardRedemptions,
      tournamentCount,
      topRegions,
      topOutlets,
      topCustomers,
    };
  }

  /** Daily series of registrations, points earned and points redeemed. */
  async trends(days: number, user: AuthenticatedUser) {
    const regionId =
      user.role === 'REGIONAL_MANAGER' ? user.regionId : undefined;
    const since = this.daysAgo(days);

    const [registrations, pointsEarned, pointsRedeemed] = await Promise.all([
      this.dailyRegistrations(days, regionId),
      this.dailyPoints('EARN', since, regionId),
      this.dailyPoints('REDEEM', since, regionId),
    ]);

    return {
      days,
      registrations,
      pointsEarned,
      pointsRedeemed: pointsRedeemed.map((b) => ({
        day: b.day,
        count: Math.abs(b.count),
      })),
    };
  }

  private async dailyRegistrations(
    days: number,
    regionId?: string | null,
  ): Promise<DailyBucket[]> {
    const since = this.daysAgo(days);
    // date_trunc bucketing in Postgres; region scope joins through the outlet.
    const rows = regionId
      ? await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(
          Prisma.sql`
            SELECT date_trunc('day', u."createdAt") AS day, COUNT(*)::bigint AS count
            FROM users u
            JOIN outlets o ON o.id = u."registeredOutletId"
            WHERE u."createdAt" >= ${since}
              AND u."deletedAt" IS NULL
              AND o."regionId" = ${regionId}::uuid
            GROUP BY 1 ORDER BY 1 ASC
          `,
        )
      : await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(
          Prisma.sql`
            SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM users
            WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
            GROUP BY 1 ORDER BY 1 ASC
          `,
        );
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  }

  private async dailyPoints(
    type: 'EARN' | 'REDEEM',
    since: Date,
    regionId?: string | null,
  ): Promise<DailyBucket[]> {
    const rows = regionId
      ? await this.prisma.$queryRaw<Array<{ day: Date; total: bigint }>>(
          Prisma.sql`
            SELECT date_trunc('day', pt."createdAt") AS day,
                   COALESCE(SUM(pt.points), 0)::bigint AS total
            FROM points_transactions pt
            JOIN outlets o ON o.id = pt."outletId"
            WHERE pt."createdAt" >= ${since}
              AND pt.type = ${type}::"TransactionType"
              AND pt.status = 'COMPLETED'
              AND o."regionId" = ${regionId}::uuid
            GROUP BY 1 ORDER BY 1 ASC
          `,
        )
      : await this.prisma.$queryRaw<Array<{ day: Date; total: bigint }>>(
          Prisma.sql`
            SELECT date_trunc('day', "createdAt") AS day,
                   COALESCE(SUM(points), 0)::bigint AS total
            FROM points_transactions
            WHERE "createdAt" >= ${since}
              AND type = ${type}::"TransactionType"
              AND status = 'COMPLETED'
            GROUP BY 1 ORDER BY 1 ASC
          `,
        );
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.total),
    }));
  }

  private async topRegions(regionId?: string | null) {
    const regions = await this.prisma.region.findMany({
      where: { deletedAt: null, ...(regionId ? { id: regionId } : {}) },
      select: { id: true, name: true, outlets: { select: { totalPoints: true } } },
    });
    return regions
      .map((r) => ({
        id: r.id,
        name: r.name,
        totalPoints: r.outlets.reduce((sum, o) => sum + Number(o.totalPoints), 0),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);
  }

  private async topOutlets(regionId?: string | null) {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null, ...(regionId ? { regionId } : {}) },
      orderBy: { totalPoints: 'desc' },
      take: 10,
      select: { id: true, name: true, totalPoints: true, customerCount: true },
    });
    return outlets.map((o) => ({
      id: o.id,
      name: o.name,
      totalPoints: Number(o.totalPoints),
      customerCount: o.customerCount,
    }));
  }

  private async topCustomers() {
    const wallets = await this.prisma.wallet.findMany({
      orderBy: { lifetimePoints: 'desc' },
      take: 10,
      select: {
        userId: true,
        lifetimePoints: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return wallets.map((w) => ({
      userId: w.userId,
      name: [w.user.firstName, w.user.lastName].filter(Boolean).join(' '),
      lifetimePoints: Number(w.lifetimePoints),
    }));
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
