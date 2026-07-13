import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListVouchersDto } from './dto/voucher.dto';

/** Upper bound on ids pulled in by a reference-prefix search. */
const SEARCH_ID_LIMIT = 1000;

/** Selection used for the list rows — deliberately excludes codeHash/codeCipher. */
const VOUCHER_SELECT = {
  id: true,
  type: true,
  status: true,
  pointsValue: true,
  batchId: true,
  expiresAt: true,
  createdAt: true,
  campaign: { select: { name: true } },
  outlet: { select: { name: true } },
  redemption: {
    select: {
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.LoyaltyCodeSelect;

type VoucherRow = Prisma.LoyaltyCodeGetPayload<{ select: typeof VOUCHER_SELECT }>;

/**
 * Cross-outlet archive of every generated loyalty code ("voucher").
 *
 * Deleting is never a hard delete: a voucher is VOIDed, so the row (and any
 * CodeRedemption hanging off it, which a customer's points balance derives
 * from) always survives. A REDEEMED voucher cannot be voided at all.
 */
@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListVouchersDto) {
    // Filters other than `status` — `counts` is computed against these so the
    // status chips keep showing every bucket's size while a status is selected.
    const baseWhere: Prisma.LoyaltyCodeWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(await this.searchFilter(query.search)),
    };
    const where: Prisma.LoyaltyCodeWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total, byStatus] = await Promise.all([
      this.prisma.loyaltyCode.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        select: VOUCHER_SELECT,
      }),
      this.prisma.loyaltyCode.count({ where }),
      this.prisma.loyaltyCode.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const counts = byStatus.reduce(
      (acc, row) => {
        acc.total += row._count._all;
        if (row.status === 'ACTIVE') acc.active += row._count._all;
        if (row.status === 'REDEEMED') acc.redeemed += row._count._all;
        if (row.status === 'EXPIRED') acc.expired += row._count._all;
        if (row.status === 'VOID') acc.void += row._count._all;
        return acc;
      },
      { total: 0, active: 0, redeemed: 0, expired: 0, void: 0 },
    );

    const mapped = items.map((c) => this.serialize(c));
    return { ...paginate(mapped, total, query), counts };
  }

  /** Void a single voucher. Redeemed vouchers are refused with a 409. */
  async void(id: string, actorId: string) {
    const voucher = await this.prisma.loyaltyCode.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');

    // A redemption already credited points to a customer's wallet. Voiding the
    // code would leave that transaction dangling, so it is simply not allowed.
    if (voucher.status === 'REDEEMED') {
      throw new ConflictException('Cannot void a redeemed voucher');
    }

    await this.prisma.loyaltyCode.update({
      where: { id },
      data: { status: 'VOID' },
    });

    await this.audit.record({
      actorId,
      action: 'voucher.void',
      entityType: 'LoyaltyCode',
      entityId: id,
      before: { status: voucher.status },
      after: { status: 'VOID' },
    });

    return { id, status: 'VOID' as const };
  }

  /**
   * Void every ACTIVE code in a batch. REDEEMED (and already EXPIRED/VOID)
   * codes are skipped rather than failing the whole run.
   */
  async voidBatch(batchId: string, actorId: string) {
    const total = await this.prisma.loyaltyCode.count({ where: { batchId } });
    if (total === 0) throw new NotFoundException('Batch not found');

    const { count } = await this.prisma.loyaltyCode.updateMany({
      where: { batchId, status: 'ACTIVE' },
      data: { status: 'VOID' },
    });

    const result = { batchId, voided: count, skipped: total - count };

    await this.audit.record({
      actorId,
      action: 'voucher.batch_void',
      entityType: 'LoyaltyCodeBatch',
      entityId: batchId,
      before: { total },
      after: { voided: result.voided, skipped: result.skipped },
    });

    return result;
  }

  /**
   * The public reference is `VCH-` + the first 8 chars of the uuid, so matching
   * it means prefix-matching the id. Prisma's `startsWith` on a `@db.Uuid`
   * column emits SQL `LIKE`, which Postgres refuses on a uuid ("operator does
   * not exist: uuid ~~ unknown"), so the prefix match is done in raw SQL with
   * an explicit `::text` cast and folded back in as an id list. Campaign and
   * outlet names are matched with a normal contains.
   */
  private async searchFilter(
    search?: string,
  ): Promise<Prisma.LoyaltyCodeWhereInput> {
    const term = search?.trim();
    if (!term) return {};

    // Accept "VCH-1A2B3C4D", "1a2b3c4d" or a full uuid alike.
    const prefix = term.replace(/^VCH-/i, '').toLowerCase();
    const or: Prisma.LoyaltyCodeWhereInput[] = [
      { campaign: { name: { contains: term, mode: 'insensitive' } } },
      { outlet: { name: { contains: term, mode: 'insensitive' } } },
    ];

    if (/^[0-9a-f-]+$/.test(prefix)) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM loyalty_codes
                   WHERE id::text LIKE ${`${prefix}%`}
                      OR "batchId"::text LIKE ${`${prefix}%`}
                   LIMIT ${SEARCH_ID_LIMIT}`,
      );
      if (rows.length > 0) or.push({ id: { in: rows.map((r) => r.id) } });
    }

    return { OR: or };
  }

  /**
   * Maps a Prisma row to the wire shape. Never returns the raw record: the
   * redeemable code (codeHash/codeCipher) must not leak, and raw Prisma values
   * are not guaranteed JSON-serializable (a BigInt would blow up res.json()).
   */
  private serialize(c: VoucherRow) {
    return {
      id: c.id,
      reference: `VCH-${c.id.slice(0, 8).toUpperCase()}`,
      type: c.type,
      status: c.status,
      points: c.pointsValue,
      campaign: c.campaign?.name ?? null,
      outlet: c.outlet?.name ?? null,
      batchId: c.batchId,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      redeemedAt: c.redemption?.createdAt.toISOString() ?? null,
      redeemedBy: c.redemption
        ? [c.redemption.user.firstName, c.redemption.user.lastName]
            .filter(Boolean)
            .join(' ') || null
        : null,
    };
  }
}
