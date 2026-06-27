import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Workbook } from 'exceljs';

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
      users.map((u: Prisma.UserGetPayload<{ include: { wallet: true } }>) => [
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
      outlets.map((o: Prisma.OutletGetPayload<{ include: { region: true; province: true; district: true } }>) => [
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
      txns.map((t: Prisma.PointsTransactionGetPayload<{ include: { user: { select: { phone: true } }; campaign: { select: { name: true } }; outlet: { select: { name: true } } } }>) => [
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

  // ── Excel exports ────────────────────────────────────────────────────────

  private styleHeaderRow(wb: Workbook, sheetName: string): void {
    const ws = wb.getWorksheet(sheetName)!;
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
    });
    headerRow.commit();
  }

  async customersXlsx(): Promise<Buffer> {
    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Customers');

    ws.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Lifetime Points', key: 'lifetimePoints', width: 20 },
      { header: 'Joined', key: 'joined', width: 20 },
    ];

    for (const u of users as Prisma.UserGetPayload<{ include: { wallet: true } }>[]) {
      ws.addRow({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        email: u.email,
        status: u.status,
        lifetimePoints: Number(u.wallet?.lifetimePoints ?? 0),
        joined: u.createdAt.toISOString(),
      });
    }

    this.styleHeaderRow(wb, 'Customers');
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async outletsXlsx(): Promise<Buffer> {
    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
      include: { region: true, province: true, district: true },
      orderBy: { totalPoints: 'desc' },
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Outlets');

    ws.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Region', key: 'region', width: 20 },
      { header: 'Province', key: 'province', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Customers', key: 'customers', width: 20 },
      { header: 'Total Points', key: 'totalPoints', width: 20 },
      { header: 'Total Sales', key: 'totalSales', width: 20 },
      { header: 'National Rank', key: 'nationalRank', width: 20 },
    ];

    for (const o of outlets as Prisma.OutletGetPayload<{ include: { region: true; province: true; district: true } }>[]) {
      ws.addRow({
        id: o.id,
        name: o.name,
        code: o.code,
        region: o.region?.name,
        province: o.province?.name,
        district: o.district?.name,
        status: o.status,
        customers: o.customerCount,
        totalPoints: Number(o.totalPoints),
        totalSales: o.totalSales.toString(),
        nationalRank: o.nationalRank ?? '',
      });
    }

    this.styleHeaderRow(wb, 'Outlets');
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async transactionsXlsx(campaignId?: string): Promise<Buffer> {
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

    const wb = new Workbook();
    const ws = wb.addWorksheet('Transactions');

    ws.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'User Phone', key: 'userPhone', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Points', key: 'points', width: 20 },
      { header: 'Balance After', key: 'balanceAfter', width: 20 },
      { header: 'Campaign', key: 'campaign', width: 20 },
      { header: 'Outlet', key: 'outlet', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
    ];

    for (const t of txns as Prisma.PointsTransactionGetPayload<{ include: { user: { select: { phone: true } }; campaign: { select: { name: true } }; outlet: { select: { name: true } } } }>[]) {
      ws.addRow({
        id: t.id,
        userPhone: t.user?.phone,
        type: t.type,
        status: t.status,
        points: t.points,
        balanceAfter: Number(t.balanceAfter),
        campaign: t.campaign?.name,
        outlet: t.outlet?.name,
        date: t.createdAt.toISOString(),
      });
    }

    this.styleHeaderRow(wb, 'Transactions');
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
