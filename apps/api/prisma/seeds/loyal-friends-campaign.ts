import { PrismaClient, RewardType } from '@prisma/client';

export type Phase =
  | 'Point Accumulation'
  | 'Outlet Qualifiers'
  | 'National Semi-Finals'
  | 'Regional Finals'
  | 'Grand Finale';

export interface SeedRewardRow {
  name: string;
  pointsCost: number;
  type: RewardType;
  phase: Phase;
  bottles: number;
  audience: 'CONSUMER' | 'OUTLET';
  perUserLimit: number;
  activeAtLaunch: boolean;
}

export const LOYAL_FRIENDS_CAMPAIGN = {
  name: 'Loyal Friends of Amstel',
  slug: 'loyal-friends-of-amstel',
  description:
    'Loyal Friends of Amstel Rewards. Consumers: one code per 2 bottles = 1 point. ' +
    'Outlets: 1 crate (24 bottles) = 1 point. Earn. Play. Win.',
} as const;

// One row per line, mirroring the client's spreadsheet for easy diffing.
// prettier-ignore
export const LOYAL_FRIENDS_REWARDS: SeedRewardRow[] = [
  { name: 'Sponsored Amstel Beer',                          pointsCost: 12,  type: 'FREE_DRINK',       phase: 'Point Accumulation',   bottles: 24,    audience: 'CONSUMER', perUserLimit: 100, activeAtLaunch: true },
  // Launches INACTIVE: the customer redeem dialog has no tournament picker yet
  // and the four stage tournaments seed as DRAFT — activate from the dashboard
  // once registration opens, or entry attempts would 400 on a missing tournamentId.
  { name: 'Tournament Entry Qualification',                 pointsCost: 12,  type: 'TOURNAMENT_ENTRY', phase: 'Point Accumulation',   bottles: 24,    audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: false },
  { name: 'Branded Key Holder',                             pointsCost: 36,  type: 'MERCHANDISE',      phase: 'Point Accumulation',   bottles: 72,    audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Branded Bottle Opener',                          pointsCost: 36,  type: 'MERCHANDISE',      phase: 'Point Accumulation',   bottles: 72,    audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Beer Bucket for the Group',                      pointsCost: 48,  type: 'FREE_DRINK',       phase: 'Outlet Qualifiers',    bottles: 96,    audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Branded Cap',                                    pointsCost: 60,  type: 'MERCHANDISE',      phase: 'Point Accumulation',   bottles: 120,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Branded T-Shirt',                                pointsCost: 72,  type: 'MERCHANDISE',      phase: 'Outlet Qualifiers',    bottles: 144,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Branded Power Bank',                             pointsCost: 96,  type: 'MERCHANDISE',      phase: 'National Semi-Finals', bottles: 192,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Branded Jumper',                                 pointsCost: 168, type: 'MERCHANDISE',      phase: 'Regional Finals',      bottles: 336,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Shared Dinner',                                  pointsCost: 240, type: 'GIFT_ITEM',        phase: 'Regional Finals',      bottles: 480,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Loyal Friends of Amstel Party Ticket',           pointsCost: 360, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 720,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'SIMBA Supermarket Shopping Voucher',             pointsCost: 360, type: 'COUPON',           phase: 'National Semi-Finals', bottles: 720,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Marriott Hotel Brunch',                          pointsCost: 420, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 840,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Nyungwe Canopy Walk',                            pointsCost: 480, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 960,   audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: 'Bicycle - Regional Second-Best Prize',           pointsCost: 600, type: 'MERCHANDISE',      phase: 'Grand Finale',         bottles: 1200,  audience: 'CONSUMER', perUserLimit: 1,   activeAtLaunch: true },
  { name: '25 Crates of Amstel Beer',                       pointsCost: 300, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 7200,  audience: 'OUTLET',   perUserLimit: 1,   activeAtLaunch: false },
  { name: 'Professional Pool Table - Regional Best Prize',  pointsCost: 335, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 8040,  audience: 'OUTLET',   perUserLimit: 1,   activeAtLaunch: false },
  { name: '50 Crates of Amstel Beer',                       pointsCost: 500, type: 'GIFT_ITEM',        phase: 'Grand Finale',         bottles: 12000, audience: 'OUTLET',   perUserLimit: 1,   activeAtLaunch: false },
];

export const STAGE_TOURNAMENTS = [
  'Outlet Qualifiers',
  'National Semi-Finals',
  'Regional Finals',
  'Grand Finale',
] as const;

function rewardDescription(row: SeedRewardRow): string {
  const crates = row.bottles / 24;
  return row.audience === 'OUTLET'
    ? `Outlet tier (${row.phase}) — 1 crate = 1 point; ${row.pointsCost} points = ${crates} crates (${row.bottles} bottles). Fulfilment coordinated with the campaign team.`
    : `${row.phase} tier — ${row.pointsCost} points (= ${row.bottles} bottles at 2 bottles per point).`;
}

/**
 * Idempotent: runs on every deploy (Render boot calls db:seed). Find-or-create
 * everywhere; the campaign upsert's update block is intentionally empty and
 * rewards/tournaments are never updated after first creation, so admin edits
 * (status, dates, inventory) always survive re-seeds.
 */
export async function seedLoyalFriendsCampaign(prisma: PrismaClient) {
  const now = new Date();
  const inTwelveMonths = new Date(now);
  inTwelveMonths.setMonth(inTwelveMonths.getMonth() + 12);

  const campaign = await prisma.campaign.upsert({
    where: { slug: LOYAL_FRIENDS_CAMPAIGN.slug },
    update: {},
    create: {
      name: LOYAL_FRIENDS_CAMPAIGN.name,
      slug: LOYAL_FRIENDS_CAMPAIGN.slug,
      description: LOYAL_FRIENDS_CAMPAIGN.description,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: inTwelveMonths,
      pointsPerCode: 1,
      pointsExpiryDays: null,
    },
  });

  for (const row of LOYAL_FRIENDS_REWARDS) {
    const existing = await prisma.reward.findFirst({
      where: { campaignId: campaign.id, name: row.name },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.reward.create({
      data: {
        campaignId: campaign.id,
        name: row.name,
        description: rewardDescription(row),
        type: row.type,
        status: row.activeAtLaunch ? 'ACTIVE' : 'INACTIVE',
        pointsCost: row.pointsCost,
        perUserLimit: row.perUserLimit,
        // Inventory is managed from the admin dashboard; null = unlimited
        // until the client sets real stock.
        totalInventory: null,
        remainingInventory: null,
      },
    });
  }

  const inFiveMonths = new Date(now);
  inFiveMonths.setMonth(inFiveMonths.getMonth() + 5);
  const inSixMonths = new Date(now);
  inSixMonths.setMonth(inSixMonths.getMonth() + 6);

  for (const stage of STAGE_TOURNAMENTS) {
    const existing = await prisma.tournament.findFirst({
      where: { campaignId: campaign.id, name: stage },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.tournament.create({
      data: {
        campaignId: campaign.id,
        name: stage,
        description: `${stage} stage of the Loyal Friends of Amstel tournament. Entry: 12 points.`,
        venue: 'To be announced',
        city: 'Kigali',
        status: 'DRAFT',
        maxPlayers: 32,
        entryPointsCost: 12,
        registrationDeadline: inFiveMonths,
        startsAt: inSixMonths,
      },
    });
  }

  return { campaignId: campaign.id };
}
