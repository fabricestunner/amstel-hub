import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

/** Escape a value for RFC-4180 CSV (quote when it contains , " or newline). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async customersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      ['ID', 'First Name', 'Last Name', 'Phone', 'Email', 'Status', 'Lifetime Points', 'Joined'],
      users.map((u) => [
        u.id,
        u.firstName,
        u.lastName,
        u.phone,
        u.email,
        u.status,
        Number(u.wallet?.lifetimePoints ?? 0),
        u.createdAt.toISOString(),
      ]),
    );
  }

  async outletsCsv(): Promise<string> {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
      include: { region: true, province: true, district: true },
      orderBy: { totalPoints: 'desc' },
    });
    return toCsv(
      ['ID', 'Name', 'Code', 'Region', 'Province', 'District', 'Status', 'Customers', 'Total Points', 'Total Sales', 'National Rank'],
      outlets.map((o) => [
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
      ]),
    );
  }

  async transactionsCsv(campaignId?: string): Promise<string> {
    const txns = await this.prisma.pointsTransaction.findMany({
      where: { ...(campaignId ? { campaignId } : {}) },
      include: {
        user: { select: { phone: true } },
        campaign: { select: { name: true } },
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });
    return toCsv(
      ['ID', 'User', 'Type', 'Status', 'Points', 'Balance After', 'Campaign', 'Outlet', 'Date'],
      txns.map((t) => [
        t.id,
        t.user?.phone,
        t.type,
        t.status,
        t.points,
        Number(t.balanceAfter),
        t.campaign?.name,
        t.outlet?.name,
        t.createdAt.toISOString(),
      ]),
    );
  }
}
