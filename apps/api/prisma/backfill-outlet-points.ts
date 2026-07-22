/* eslint-disable no-console */
/**
 * One-time backfill for the outlet points fix: Outlet.totalPoints and
 * Outlet.availablePoints were added/started-being-written going forward by
 * LoyaltyService.redeemCode, but existing outlets already have real
 * codeRedemption history that predates the fix. This sums that history and
 * sets both columns to match — safe to run more than once (idempotent: it
 * always sets an absolute value, never increments).
 *
 * Run AFTER the outlet_points_and_rewards migration has been applied:
 *
 *   pnpm --filter @amstel/api db:migrate
 *   pnpm --filter @amstel/api backfill:outlet-points
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Summing historical code redemptions per outlet…');
  const grouped = await prisma.codeRedemption.groupBy({
    by: ['outletId'],
    where: { outletId: { not: null } },
    _sum: { points: true },
  });

  console.log(`Backfilling ${grouped.length} outlet(s)…`);
  for (const g of grouped) {
    if (!g.outletId) continue;
    const total = g._sum.points ?? 0;
    await prisma.outlet.update({
      where: { id: g.outletId },
      data: { totalPoints: total, availablePoints: total },
    });
    console.log(`  ✓ ${g.outletId} → ${total} points`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
