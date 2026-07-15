import {
  LOYAL_FRIENDS_REWARDS,
  STAGE_TOURNAMENTS,
  seedLoyalFriendsCampaign,
} from '../../prisma/seeds/loyal-friends-campaign';

describe('Loyal Friends seed table', () => {
  const consumer = LOYAL_FRIENDS_REWARDS.filter((r) => r.audience === 'CONSUMER');
  const outlet = LOYAL_FRIENDS_REWARDS.filter((r) => r.audience === 'OUTLET');

  it('mirrors the client table: 15 consumer rows + 3 outlet rows', () => {
    expect(consumer).toHaveLength(15);
    expect(outlet).toHaveLength(3);
  });

  it('every consumer bottle threshold is points × 2 (2 bottles = 1 point)', () => {
    for (const r of consumer) expect(r.bottles).toBe(r.pointsCost * 2);
  });

  it('every outlet bottle threshold is points × 24 (1 crate = 1 point)', () => {
    for (const r of outlet) expect(r.bottles).toBe(r.pointsCost * 24);
  });

  it('matches the exact client point costs', () => {
    expect(consumer.map((r) => r.pointsCost)).toEqual([
      12, 12, 36, 36, 48, 60, 72, 96, 168, 240, 360, 360, 420, 480, 600,
    ]);
    expect(outlet.map((r) => r.pointsCost)).toEqual([300, 335, 500]);
  });

  it('outlet tiers launch INACTIVE; consumer tiers launch ACTIVE', () => {
    for (const r of outlet) expect(r.activeAtLaunch).toBe(false);
    for (const r of consumer) {
      // Tournament entry stays INACTIVE until the DRAFT stage tournaments
      // open for registration (redeeming it needs a tournamentId).
      expect(r.activeAtLaunch).toBe(r.type !== 'TOURNAMENT_ENTRY');
    }
  });

  it('defines the four stage tournaments', () => {
    expect(STAGE_TOURNAMENTS).toEqual([
      'Outlet Qualifiers',
      'National Semi-Finals',
      'Regional Finals',
      'Grand Finale',
    ]);
  });
});

describe('seedLoyalFriendsCampaign idempotency', () => {
  function buildPrisma(existing: boolean) {
    return {
      campaign: {
        upsert: jest.fn().mockResolvedValue({ id: 'camp-lf' }),
      },
      reward: {
        findFirst: jest.fn().mockResolvedValue(existing ? { id: 'r-x' } : null),
        create: jest.fn().mockResolvedValue({ id: 'r-new' }),
      },
      tournament: {
        findFirst: jest.fn().mockResolvedValue(existing ? { id: 't-x' } : null),
        create: jest.fn().mockResolvedValue({ id: 't-new' }),
      },
    };
  }

  it('first run creates 18 rewards and 4 tournaments', async () => {
    const prisma = buildPrisma(false);
    await seedLoyalFriendsCampaign(prisma as never);
    expect(prisma.reward.create).toHaveBeenCalledTimes(18);
    expect(prisma.tournament.create).toHaveBeenCalledTimes(4);
  });

  it('re-run creates nothing (find-or-create finds everything)', async () => {
    const prisma = buildPrisma(true);
    await seedLoyalFriendsCampaign(prisma as never);
    expect(prisma.reward.create).not.toHaveBeenCalled();
    expect(prisma.tournament.create).not.toHaveBeenCalled();
  });

  it('campaign upsert never updates admin-owned fields', async () => {
    const prisma = buildPrisma(true);
    await seedLoyalFriendsCampaign(prisma as never);
    expect(prisma.campaign.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });
});
