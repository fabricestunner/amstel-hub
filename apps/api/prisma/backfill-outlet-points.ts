/* eslint-disable no-console */
/**
 * One-time backfill for the outlet points fix: Outlet.totalPoints and
 * Outlet.availablePoints were added/started-being-written going forward by
 * LoyaltyService.redeemCode, but existing outlets already have real
 * codeRedemption history that predates the fix. This sums that history to
 * rebuild both columns.
 *
 * Safe to re-run: `totalPoints` (lifetime earned) is always set to the full
 * sum of historical code redemptions, which is monotonic and never wrong to
 * recompute. `availablePoints` (spendable balance) additionally subtracts
 * everything the outlet has already spent on outlet-reward redemptions, so
 * re-running after outlets have made redemptions will NOT re-credit spent
 * points back onto the balance.
 *
 * Every OutletRewardRedemption counts as spent regardless of status
 * (PENDING/APPROVED/REJECTED/FULFILLED): outlet-rewards.service.ts debits
 * `availablePoints` synchronously at redemption time and its
 * `setRedemptionStatus` (approve/reject/fulfill) never credits it back — a
 * REJECTED redemption does not refund the outlet. So as far as the live
 * balance is concerned, those points are gone the moment the redemption is
 * created, and the backfill must treat them the same way or it would
 * over-credit outlets by the sum of their rejected redemptions.
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

  console.log('Summing outlet-reward spend per outlet…');
  const spentGroups = await prisma.outletRewardRedemption.groupBy({
    by: ['outletId'],
    _sum: { pointsSpent: true },
  });
  const spentByOutlet = new Map(
    spentGroups.map((g) => [g.outletId, g._sum.pointsSpent ?? 0]),
  );

  console.log(`Backfilling ${grouped.length} outlet(s)…`);
  for (const g of grouped) {
    if (!g.outletId) continue;
    const total = g._sum.points ?? 0;
    const spent = spentByOutlet.get(g.outletId) ?? 0;
    const available = Math.max(0, total - spent);
    await prisma.outlet.update({
      where: { id: g.outletId },
      data: { totalPoints: total, availablePoints: available },
    });
    console.log(
      `  ✓ ${g.outletId} → earned ${total}, available ${available} (spent ${spent})`,
    );
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
