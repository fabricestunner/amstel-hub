import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Escape a value for RFC-4180 CSV (quote when it contains , " or newline). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

/** Admin report types → any of the platform-management roles. */
const ADMIN_ROLES: AuthenticatedUser['role'][] = [
  'SUPER_ADMIN',
  'CAMPAIGN_MANAGER',
  'REGIONAL_MANAGER',
];

const ADMIN_TYPES = ['loyalty', 'campaigns', 'rewards', 'outlets'] as const;
const OUTLET_TYPES = ['outlet-sales', 'outlet-customers'] as const;

type ReportType = (typeof ADMIN_TYPES)[number] | (typeof OUTLET_TYPES)[number];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a report `type` into a downloadable CSV string, enforcing that the
   * requesting user's role (and outlet scope, for outlet reports) may read it.
   */
  async buildCsv(
    type: string,
    user: AuthenticatedUser,
  ): Promise<{ filename: string; csv: string }> {
    const isAdminType = (ADMIN_TYPES as readonly string[]).includes(type);
    const isOutletType = (OUTLET_TYPES as readonly string[]).includes(type);

    if (!isAdminType && !isOutletType) {
      throw new NotFoundException(`Unknown report type "${type}"`);
    }

    if (isAdminType && !ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not permitted to export this report');
    }
    if (isOutletType) {
      if (user.role !== 'OUTLET_MANAGER') {
        throw new ForbiddenException('Not permitted to export this report');
      }
      if (!user.outletId) {
        throw new ForbiddenException('No outlet is assigned to your account');
      }
    }

    const csv = await this.render(type as ReportType, user);
    const date = new Date().toISOString().slice(0, 10);
    return { filename: `${type}-${date}.csv`, csv };
  }

  private render(type: ReportType, user: AuthenticatedUser): Promise<string> {
    switch (type) {
      case 'loyalty':
        return this.loyaltyCsv();
      case 'campaigns':
        return this.campaignsCsv();
      case 'rewards':
        return this.rewardsCsv();
      case 'outlets':
        return this.outletsCsv();
      case 'outlet-sales':
        return this.outletSalesCsv(user.outletId!);
      case 'outlet-customers':
        return this.outletCustomersCsv(user.outletId!);
    }
  }

  // ── Admin reports ─────────────────────────────────────────────────────────

  private async loyaltyCsv(): Promise<string> {
    const txns = await this.prisma.pointsTransaction.findMany({
      include: {
        user: { select: { phone: true } },
        campaign: { select: { name: true } },
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });
    return toCsv(
      [
        'ID',
        'User',
        'Type',
        'Status',
        'Points',
        'Balance After',
        'Campaign',
        'Outlet',
        'Date',
      ],
      txns.map(
        (
          t: Prisma.PointsTransactionGetPayload<{
            include: {
              user: { select: { phone: true } };
              campaign: { select: { name: true } };
              outlet: { select: { name: true } };
            };
          }>,
        ) => [
          t.id,
          t.user?.phone,
          t.type,
          t.status,
          t.points,
          Number(t.balanceAfter),
          t.campaign?.name,
          t.outlet?.name,
          t.createdAt.toISOString(),
        ],
      ),
    );
  }

  private async campaignsCsv(): Promise<string> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate code counts per campaign/status in one pass (no N+1).
    const codeGroups = await this.prisma.loyaltyCode.groupBy({
      by: ['campaignId', 'status'],
      _count: { _all: true },
    });
    const generated = new Map<string, number>();
    const redeemed = new Map<string, number>();
    for (const g of codeGroups) {
      const count = g._count._all;
      generated.set(g.campaignId, (generated.get(g.campaignId) ?? 0) + count);
      if (g.status === 'REDEEMED') {
        redeemed.set(g.campaignId, (redeemed.get(g.campaignId) ?? 0) + count);
      }
    }

    return toCsv(
      [
        'ID',
        'Name',
        'Status',
        'Starts',
        'Ends',
        'Points Per Code',
        'Codes Generated',
        'Codes Redeemed',
      ],
      campaigns.map((c) => [
        c.id,
        c.name,
        c.status,
        c.startsAt.toISOString(),
        c.endsAt.toISOString(),
        c.pointsPerCode,
        generated.get(c.id) ?? 0,
        redeemed.get(c.id) ?? 0,
      ]),
    );
  }

  private async rewardsCsv(): Promise<string> {
    const redemptions = await this.prisma.rewardRedemption.findMany({
      include: {
        reward: { select: { name: true } },
        user: { select: { phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });
    return toCsv(
      [
        'ID',
        'Reward',
        'Customer',
        'Status',
        'Points Spent',
        'Fulfillment Ref',
        'Requested',
        'Fulfilled At',
      ],
      redemptions.map(
        (
          r: Prisma.RewardRedemptionGetPayload<{
            include: {
              reward: { select: { name: true } };
              user: { select: { phone: true } };
            };
          }>,
        ) => [
          r.id,
          r.reward?.name,
          r.user?.phone,
          r.status,
          r.pointsSpent,
          r.fulfillmentRef,
          r.createdAt.toISOString(),
          r.fulfilledAt?.toISOString(),
        ],
      ),
    );
  }

  private async outletsCsv(): Promise<string> {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
      include: { region: true, province: true, district: true },
      orderBy: { totalPoints: 'desc' },
    });
    return toCsv(
      [
        'ID',
        'Name',
        'Code',
        'Region',
        'Province',
        'District',
        'Status',
        'Customers',
        'Total Points',
        'Total Sales',
        'National Rank',
      ],
      outlets.map(
        (
          o: Prisma.OutletGetPayload<{
            include: { region: true; province: true; district: true };
          }>,
        ) => [
          o.id,
          o.name,
          o.code,
          o.region?.name,
          o.province?.name,
          o.district?.name,
          o.status,
          o.customerCount,
          Number(o.totalPoints),
          o.totalSales.toString(),
          o.nationalRank ?? '',
        ],
      ),
    );
  }

  // ── Outlet-scoped reports ─────────────────────────────────────────────────

  private async outletSalesCsv(outletId: string): Promise<string> {
    // Points earned at this outlet, summarised per campaign.
    const groups = await this.prisma.pointsTransaction.groupBy({
      by: ['campaignId'],
      where: { outletId, type: 'EARN' },
      _count: { _all: true },
      _sum: { points: true },
    });

    const campaignIds = groups
      .map((g) => g.campaignId)
      .filter((id): id is string => Boolean(id));
    const campaigns = campaignIds.length
      ? await this.prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(campaigns.map((c) => [c.id, c.name]));

    return toCsv(
      ['Campaign', 'Redemptions', 'Points Generated', 'Estimated Beers Sold'],
      groups.map((g) => [
        g.campaignId ? (names.get(g.campaignId) ?? g.campaignId) : 'Unattributed',
        g._count._all,
        g._sum.points ?? 0,
        // Each scanned code corresponds to one bottle, so beers sold ≈ the
        // number of redemptions attributed to the campaign.
        g._count._all,
      ]),
    );
  }

  private async outletCustomersCsv(outletId: string): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null, registeredOutletId: outletId },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      [
        'ID',
        'First Name',
        'Last Name',
        'Phone',
        'Email',
        'Status',
        'Lifetime Points',
        'Joined',
      ],
      users.map(
        (u: Prisma.UserGetPayload<{ include: { wallet: true } }>) => [
          u.id,
          u.firstName,
          u.lastName,
          u.phone,
          u.email,
          u.status,
          Number(u.wallet?.lifetimePoints ?? 0),
          u.createdAt.toISOString(),
        ],
      ),
    );
  }
}
