/* eslint-disable no-console */
/**
 * One-time production cleanup for the customer reward catalog.
 *
 * Production was seeded via `prisma db push && db:seed` on every deploy with an
 * older, non-idempotent base seed, which inserted the four demo rewards fresh on
 * each run — leaving ~200 duplicate demo rows (e.g. "Free Amstel (2)" ×61,
 * "Tournament Entry" ×62, "Branded T-Shirt" @150 ×63, "Amstel Voucher" ×23) in
 * the client-facing catalog. The real campaign prizes (from the Loyal Friends
 * seed) are unaffected — each already appears exactly once.
 *
 * This script makes the live catalog match the client's official list:
 *   1. Removes the four demo rewards entirely (all copies).
 *   2. Collapses any accidental duplicate of a real reward (defensive; there are
 *      none today, but keeps the script correct if run later).
 *   3. Activates "Tournament Entry Qualification" (12 pts), which shipped
 *      INACTIVE and so is invisible in the catalog.
 *
 * All removals are SOFT deletes (`deletedAt`) — reversible and FK-safe (a
 * redemption pointing at a removed row keeps working; the reward is just hidden
 * from the catalog, which filters `deletedAt IS NULL`).
 *
 * Idempotent: safe to run more than once. A second run is a no-op.
 *
 * Run once against production (Render Shell, with the prod DATABASE_URL in env):
 *   pnpm --filter @amstel/api cleanup:prod-rewards
 *
 * Review the printed before/after counts. To undo a soft delete, clear the
 * row's `deletedAt`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Demo/sample rewards that are NOT part of the client catalog. Keyed by
// (name, pointsCost) so the real "Branded T-Shirt" (72 pts) is never touched —
// only the demo one at 150 pts.
const DEMO_REWARDS: Array<{ name: string; pointsCost: number }> = [
  { name: 'Amstel Voucher', pointsCost: 2 },
  { name: 'Free Amstel (2)', pointsCost: 80 },
  { name: 'Tournament Entry', pointsCost: 100 },
  { name: 'Branded T-Shirt', pointsCost: 150 },
];

async function activeCount(): Promise<number> {
  return prisma.reward.count({ where: { deletedAt: null } });
}

async function main() {
  const before = await activeCount();
  console.log(`Customer rewards before cleanup (not soft-deleted): ${before}`);

  console.log('1) Removing demo rewards…');
  const now = new Date();
  let demoRemoved = 0;
  for (const d of DEMO_REWARDS) {
    const res = await prisma.reward.updateMany({
      where: { name: d.name, pointsCost: d.pointsCost, deletedAt: null },
      data: { deletedAt: now },
    });
    demoRemoved += res.count;
    console.log(`   ✓ ${res.count.toString().padStart(3)} × ${d.pointsCost} | ${d.name}`);
  }

  console.log('2) De-duplicating any repeated real reward…');
  const active = await prisma.reward.findMany({
    where: { deletedAt: null },
    select: { id: true, campaignId: true, name: true, pointsCost: true },
    orderBy: { createdAt: 'asc' }, // keep the earliest of each group
  });
  const seen = new Set<string>();
  const dupeIds: string[] = [];
  for (const r of active) {
    const key = `${r.campaignId}|${r.name}|${r.pointsCost}`;
    if (seen.has(key)) dupeIds.push(r.id);
    else seen.add(key);
  }
  if (dupeIds.length > 0) {
    await prisma.reward.updateMany({
      where: { id: { in: dupeIds } },
      data: { deletedAt: now },
    });
  }
  console.log(`   ✓ ${dupeIds.length} duplicate row(s) removed`);

  console.log('3) Activating "Tournament Entry Qualification"…');
  const activated = await prisma.reward.updateMany({
    where: {
      name: 'Tournament Entry Qualification',
      deletedAt: null,
      status: { not: 'ACTIVE' },
    },
    data: { status: 'ACTIVE' },
  });
  console.log(`   ✓ ${activated.count} row(s) set ACTIVE`);

  const after = await activeCount();
  const activeActive = await prisma.reward.count({
    where: { deletedAt: null, status: 'ACTIVE' },
  });
  console.log('');
  console.log(
    `Done. Catalog rows ${before} → ${after} ` +
      `(${demoRemoved} demo + ${dupeIds.length} dupes removed). ` +
      `ACTIVE customer rewards now: ${activeActive} (expected 15).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
