import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LeaderboardsService } from './leaderboards.service';

const redis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
} as unknown as RedisService;

/**
 * Exposes the private recompute* methods under test without going through
 * NestJS's testing module (matching this repo's plain-mock convention in
 * outlets.service.spec.ts / outlet-rewards.service.spec.ts).
 */
type RecomputeAccess = {
  recomputeOutletNational: () => Promise<void>;
  recomputeOutletRegional: () => Promise<void>;
};

interface OutletRow {
  id: string;
  regionId: string;
  totalPoints: bigint;
}

function outletRow(id: string, regionId: string, totalPoints: bigint): OutletRow {
  return { id, regionId, totalPoints };
}

/**
 * Builds a mock PrismaService whose `outlet.findMany` returns `outlets`
 * as-is. The real query sorts server-side (`orderBy totalPoints desc` for
 * national, `orderBy [regionId asc, totalPoints desc]` for regional), so
 * callers must pass `outlets` already in that order — exactly as Postgres
 * would hand them back.
 *
 * `$transaction` here receives an array of already-invoked promises (the
 * service calls `deleteMany(...)`/`createMany(...)` eagerly to build the
 * array), so the mock only needs to await them — unlike the callback-style
 * `$transaction` used elsewhere in this codebase.
 */
function buildPrisma(outlets: OutletRow[]) {
  const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const createMany = jest.fn().mockResolvedValue({ count: outlets.length });
  const executeRaw = jest.fn().mockResolvedValue(1);
  const findMany = jest.fn().mockResolvedValue(outlets);

  const prisma = {
    outlet: { findMany },
    leaderboardEntry: { deleteMany, createMany },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    $executeRaw: executeRaw,
  } as unknown as PrismaService;

  return { prisma, deleteMany, createMany, executeRaw, findMany };
}

describe('LeaderboardsService — Fix B: region-scoped delete in upsertRanked', () => {
  const REGION_A = 'aaaaaaaa-0000-0000-0000-000000000001';
  const REGION_B = 'bbbbbbbb-0000-0000-0000-000000000002';

  it('recomputeOutletRegional issues a region-scoped deleteMany for every region, so earlier regions survive later ones', async () => {
    // Two regions, region A written first (matches orderBy regionId asc).
    const outlets = [
      outletRow('o1', REGION_A, 200n),
      outletRow('o2', REGION_A, 100n),
      outletRow('o3', REGION_B, 50n),
    ];
    const { prisma, deleteMany } = buildPrisma(outlets);
    const service = new LeaderboardsService(prisma, redis) as unknown as RecomputeAccess;

    await service.recomputeOutletRegional();

    // One region-scoped delete per region — never a single delete covering
    // the whole (type, period) slice, which would wipe region A's freshly
    // inserted rows the moment region B's iteration runs.
    expect(deleteMany).toHaveBeenCalledTimes(2);
    const regionIdsDeleted = deleteMany.mock.calls.map((call) => {
      const where = (call[0] as { where: { regionId?: string } }).where;
      // This is the crux of Fix B: against the old unscoped code, `where`
      // is `{ type, period }` with no `regionId` key at all, so this
      // assertion is what actually distinguishes fixed from broken.
      expect(where.regionId).toBeDefined();
      return where.regionId;
    });
    expect(new Set(regionIdsDeleted)).toEqual(new Set([REGION_A, REGION_B]));

    // Each delete must be scoped to exactly its own region, not some other
    // region and not the whole slice.
    expect(deleteMany).toHaveBeenNthCalledWith(1, {
      where: { type: 'OUTLET_REGIONAL', period: 'ALL', regionId: REGION_A },
    });
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      where: { type: 'OUTLET_REGIONAL', period: 'ALL', regionId: REGION_B },
    });
  });

  it('recomputeOutletNational still issues a single UNSCOPED deleteMany (no regionId) since it writes one global ranking', async () => {
    const outlets = [outletRow('o1', REGION_A, 200n), outletRow('o2', REGION_B, 100n)];
    const { prisma, deleteMany } = buildPrisma(outlets);
    const service = new LeaderboardsService(prisma, redis) as unknown as RecomputeAccess;

    await service.recomputeOutletNational();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    // Exact-object match: confirms there is no `regionId` key at all, pinning
    // the distinction against a future refactor that might collapse the two
    // delete behaviors into always-scoped or always-unscoped.
    expect(deleteMany).toHaveBeenCalledWith({
      where: { type: 'OUTLET_NATIONAL', period: 'ALL' },
    });
  });
});

describe('LeaderboardsService — Fix C: ranks written back to Outlet rows', () => {
  const REGION_A = 'aaaaaaaa-0000-0000-0000-000000000001';
  const REGION_B = 'bbbbbbbb-0000-0000-0000-000000000002';

  it('recomputeOutletNational writes nationalRank via a single executeRaw call, ranked highest-points-first', async () => {
    const outlets = [
      outletRow('o-hi', REGION_A, 300n),
      outletRow('o-mid', REGION_A, 200n),
      outletRow('o-lo', REGION_B, 50n),
    ];
    const { prisma, executeRaw } = buildPrisma(outlets);
    const service = new LeaderboardsService(prisma, redis) as unknown as RecomputeAccess;

    await service.recomputeOutletNational();

    // A single bulk UPDATE, not one query per outlet.
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const sqlArg = executeRaw.mock.calls[0][1] as Prisma.Sql;
    // Prisma.join/Prisma.sql flatten to [id, rank, id, rank, ...] in the
    // order persistRanks was handed the ids — asserting on `.values` pins
    // both that ranks were written at all (Fix C) and that rank 1 went to
    // the highest-points outlet.
    expect(sqlArg.values).toEqual(['o-hi', 1, 'o-mid', 2, 'o-lo', 3]);
  });

  it('recomputeOutletRegional writes regionalRank once per region, ranked independently within each region', async () => {
    const outlets = [
      outletRow('a-hi', REGION_A, 500n),
      outletRow('a-lo', REGION_A, 100n),
      outletRow('b-hi', REGION_B, 900n),
    ];
    const { prisma, executeRaw } = buildPrisma(outlets);
    const service = new LeaderboardsService(prisma, redis) as unknown as RecomputeAccess;

    await service.recomputeOutletRegional();

    expect(executeRaw).toHaveBeenCalledTimes(2);
    const allValues = executeRaw.mock.calls.map(
      (call) => (call[1] as Prisma.Sql).values,
    );
    // Region A: a-hi (500) ranks 1, a-lo (100) ranks 2 — independent of
    // region B's own points scale.
    expect(allValues).toContainEqual(['a-hi', 1, 'a-lo', 2]);
    // Region B: single outlet, rank 1 — not offset by region A's count.
    expect(allValues).toContainEqual(['b-hi', 1]);
  });
});
