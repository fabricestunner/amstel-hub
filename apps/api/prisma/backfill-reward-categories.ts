/* eslint-disable no-console */
/**
 * Seeds the system reward categories from the fixed RewardType values and
 * backfills every existing reward's `categoryId` from its current `type`.
 *
 * Idempotent — safe to run more than once. Run AFTER `prisma db push` has
 * added the reward_categories table and rewards.categoryId column:
 *
 *   pnpm --filter @amstel/api db:generate
 *   pnpm --filter @amstel/api exec prisma db push
 *   pnpm --filter @amstel/api backfill:reward-categories
 */
import { PrismaClient, RewardBehavior, RewardType } from '@prisma/client';

const prisma = new PrismaClient();

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Human-friendly name for each existing enum value, in display order. The
// tournament one carries TOURNAMENT_ENTRY behaviour; the rest are STANDARD.
const SYSTEM_CATEGORIES: {
  type: RewardType;
  name: string;
  behavior: RewardBehavior;
}[] = [
  { type: 'MERCHANDISE', name: 'Merchandise', behavior: 'STANDARD' },
  { type: 'FREE_DRINK', name: 'Free Drink', behavior: 'STANDARD' },
  { type: 'GIFT_ITEM', name: 'Gift Item', behavior: 'STANDARD' },
  { type: 'CASH', name: 'Cash', behavior: 'STANDARD' },
  { type: 'COUPON', name: 'Coupon', behavior: 'STANDARD' },
  { type: 'DIGITAL', name: 'Digital', behavior: 'STANDARD' },
  {
    type: 'TOURNAMENT_ENTRY',
    name: 'Tournament Entry',
    behavior: 'TOURNAMENT_ENTRY',
  },
];

async function main() {
  console.log('Seeding system reward categories…');
  const byType = new Map<RewardType, string>();

  for (let i = 0; i < SYSTEM_CATEGORIES.length; i++) {
    const { type, name, behavior } = SYSTEM_CATEGORIES[i];
    const slug = slugify(name);
    const category = await prisma.rewardCategory.upsert({
      where: { slug },
      // Never downgrade an admin-touched row; only fill fields on first insert.
      update: { isSystem: true, behavior },
      create: { name, slug, behavior, isSystem: true, sortOrder: i },
    });
    byType.set(type, category.id);
    console.log(`  ✓ ${name} (${behavior}) → ${category.id}`);
  }

  console.log('Backfilling rewards without a category…');
  let updated = 0;
  for (const [type, categoryId] of byType) {
    const res = await prisma.reward.updateMany({
      where: { type, categoryId: null },
      data: { categoryId },
    });
    updated += res.count;
    if (res.count > 0) console.log(`  ✓ ${res.count} × ${type}`);
  }

  console.log(`Done. ${byType.size} categories, ${updated} rewards backfilled.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
