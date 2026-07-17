import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ListRedemptionsDto } from './dto/reward.dto';
import { RewardsService } from './rewards.service';

function notificationsStub(): NotificationsService {
  return {
    notifyAllChannels: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
}

/** Construct the service with a no-op notifications stub unless one is given. */
function makeService(
  prisma: PrismaService,
  notifications: NotificationsService = notificationsStub(),
) {
  return new RewardsService(prisma, notifications);
}

/**
 * Unit tests for reward redemption guards. Prisma is mocked; we assert the
 * validation rules (missing reward, inactive, out-of-stock, per-user limit,
 * insufficient points, tournament-entry requires a tournamentId) and the
 * happy path that debits the wallet.
 */
describe('RewardsService.redeem', () => {
  const wallet = { availablePoints: 1000n, redeemedPoints: 0n };

  function buildPrisma(overrides: {
    reward?: unknown;
    priorClaims?: number;
    wallet?: unknown;
    outlet?: unknown;
  }): PrismaService {
    const tx = {
      reward: {
        findFirst: jest.fn().mockResolvedValue(overrides.reward),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rewardRedemption: {
        count: jest.fn().mockResolvedValue(overrides.priorClaims ?? 0),
        create: jest.fn().mockResolvedValue({ id: 'rr-1', status: 'PENDING' }),
      },
      wallet: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            overrides.wallet === undefined ? wallet : overrides.wallet,
          ),
        update: jest
          .fn()
          .mockResolvedValue({ availablePoints: 500n }),
      },
      tournamentRegistration: { create: jest.fn().mockResolvedValue({}) },
      pointsTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    return {
      outlet: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            overrides.outlet === undefined ? { id: 'o1' } : overrides.outlet,
          ),
      },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

  const dto = { collectionOutletId: 'o1' };

  const activeReward = {
    id: 'r1',
    status: 'ACTIVE',
    type: 'MERCHANDISE',
    pointsCost: 500,
    perUserLimit: 1,
    remainingInventory: 10,
    validFrom: null,
    validUntil: null,
    campaignId: 'c1',
    name: 'Cooler',
  };

  it('throws when collection outlet is invalid', async () => {
    const svc = makeService(
      buildPrisma({ reward: activeReward, outlet: null }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when reward does not exist', async () => {
    const svc = makeService(buildPrisma({ reward: null }));
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(NotFoundException);
  });

  it('throws when reward is not ACTIVE', async () => {
    const svc = makeService(
      buildPrisma({ reward: { ...activeReward, status: 'INACTIVE' } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when out of stock', async () => {
    const svc = makeService(
      buildPrisma({ reward: { ...activeReward, remainingInventory: 0 } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(ConflictException);
  });

  it('throws when per-user limit reached', async () => {
    const svc = makeService(
      buildPrisma({ reward: activeReward, priorClaims: 1 }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(ConflictException);
  });

  it('throws when tournament entry has no tournamentId', async () => {
    const svc = makeService(
      buildPrisma({ reward: { ...activeReward, type: 'TOURNAMENT_ENTRY' } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when wallet has insufficient points', async () => {
    const svc = makeService(
      buildPrisma({ reward: activeReward, wallet: { availablePoints: 100n } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debits the wallet on the happy path', async () => {
    const svc = makeService(buildPrisma({ reward: activeReward }));
    const res = await svc.redeem('u1', 'r1', dto);
    expect(res.pointsSpent).toBe(500);
    expect(res.availablePoints).toBe(500);
    expect(res.status).toBe('PENDING');
  });
});

/**
 * Outlet scoping for the redemption fulfillment queue. Admins see and act
 * on everything; an OUTLET_MANAGER is limited to redemptions whose
 * collectionOutletId is their own outlet and may only fulfill APPROVED ones.
 */
describe('RewardsService redemption outlet scoping', () => {
  const admin: AuthenticatedUser = {
    id: 'admin-1',
    role: 'SUPER_ADMIN',
    regionId: null,
    outletId: null,
    permissions: [],
  };
  const outletManager: AuthenticatedUser = {
    id: 'mgr-1',
    role: 'OUTLET_MANAGER',
    regionId: null,
    outletId: 'o1',
    permissions: [],
  };

  const listQuery = Object.assign(new ListRedemptionsDto(), {
    page: 1,
    limit: 20,
    sortOrder: 'desc' as const,
  });

  function buildPrisma(redemption: unknown): PrismaService {
    return {
      rewardRedemption: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(redemption),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'rr-1', ...data }),
          ),
      },
    } as unknown as PrismaService;
  }

  describe('listRedemptions', () => {
    it('does not restrict admins', async () => {
      const prisma = buildPrisma(null);
      const svc = makeService(prisma);
      await svc.listRedemptions(listQuery, admin);
      const args = (prisma.rewardRedemption.findMany as jest.Mock).mock
        .calls[0][0];
      expect(args.where.collectionOutletId).toBeUndefined();
    });

    it('force-filters OUTLET_MANAGER to their outlet', async () => {
      const prisma = buildPrisma(null);
      const svc = makeService(prisma);
      await svc.listRedemptions(listQuery, outletManager);
      const args = (prisma.rewardRedemption.findMany as jest.Mock).mock
        .calls[0][0];
      expect(args.where.collectionOutletId).toBe('o1');
    });

    it('matches nothing when an OUTLET_MANAGER has no outlet', async () => {
      const prisma = buildPrisma(null);
      const svc = makeService(prisma);
      await svc.listRedemptions(listQuery, {
        ...outletManager,
        outletId: null,
      });
      const args = (prisma.rewardRedemption.findMany as jest.Mock).mock
        .calls[0][0];
      expect(args.where.collectionOutletId).toBe('__none__');
    });
  });

  describe('fulfill', () => {
    it('lets an admin fulfill any redemption', async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'APPROVED',
        collectionOutletId: 'other-outlet',
      });
      const svc = makeService(prisma);
      const res = await svc.fulfill('rr-1', admin);
      expect(res.status).toBe('FULFILLED');
      expect(res.approvedById).toBe('admin-1');
    });

    it('lets an OUTLET_MANAGER fulfill an approved redemption at their outlet', async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'APPROVED',
        collectionOutletId: 'o1',
      });
      const svc = makeService(prisma);
      const res = await svc.fulfill('rr-1', outletManager);
      expect(res.status).toBe('FULFILLED');
      expect(res.approvedById).toBe('mgr-1');
    });

    it("rejects an OUTLET_MANAGER fulfilling another outlet's redemption", async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'APPROVED',
        collectionOutletId: 'other-outlet',
      });
      const svc = makeService(prisma);
      await expect(svc.fulfill('rr-1', outletManager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an OUTLET_MANAGER fulfill a PENDING redemption directly (customer picked it up)', async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'PENDING',
        collectionOutletId: 'o1',
      });
      const svc = makeService(prisma);
      const res = await svc.fulfill('rr-1', outletManager);
      expect(res.status).toBe('FULFILLED');
    });

    it('rejects an OUTLET_MANAGER fulfilling a rejected redemption', async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'REJECTED',
        collectionOutletId: 'o1',
      });
      const svc = makeService(prisma);
      await expect(svc.fulfill('rr-1', outletManager)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('404s when the redemption does not exist', async () => {
      const prisma = buildPrisma(null);
      const svc = makeService(prisma);
      await expect(svc.fulfill('missing', outletManager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

/**
 * Editing a reward's total stock must keep remainingInventory in step, so the
 * already-consumed count (total - remaining) is preserved. Otherwise raising the
 * cap wouldn't actually make more units available to customers.
 */
describe('RewardsService.update inventory', () => {
  function buildPrisma(existing: Record<string, unknown>): {
    prisma: PrismaService;
    update: jest.Mock;
  } {
    const update = jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'r1', ...data }),
      );
    const prisma = {
      reward: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update,
      },
    } as unknown as PrismaService;
    return { prisma, update };
  }

  it('raises remainingInventory by the same delta when total stock grows', async () => {
    // 500 total, 400 remaining => 100 consumed. Raise total to 800 => 700 left.
    const { prisma, update } = buildPrisma({
      id: 'r1',
      totalInventory: 500,
      remainingInventory: 400,
    });
    const svc = makeService(prisma);

    await svc.update('r1', { totalInventory: 800 } as never);

    const data = update.mock.calls[0][0].data;
    expect(data.totalInventory).toBe(800);
    expect(data.remainingInventory).toBe(700);
  });

  it('never lets remainingInventory go negative when total stock shrinks', async () => {
    // 500 total, 100 remaining => 400 consumed. Drop total to 300 => clamp to 0.
    const { prisma, update } = buildPrisma({
      id: 'r1',
      totalInventory: 500,
      remainingInventory: 100,
    });
    const svc = makeService(prisma);

    await svc.update('r1', { totalInventory: 300 } as never);

    const data = update.mock.calls[0][0].data;
    expect(data.remainingInventory).toBe(0);
  });

  it('leaves inventory untouched when totalInventory is not in the patch', async () => {
    const { prisma, update } = buildPrisma({
      id: 'r1',
      totalInventory: 500,
      remainingInventory: 400,
    });
    const svc = makeService(prisma);

    await svc.update('r1', { pointsCost: 250 } as never);

    const data = update.mock.calls[0][0].data;
    expect(data.totalInventory).toBeUndefined();
    expect(data.remainingInventory).toBeUndefined();
  });
});

/**
 * Reward lifecycle notifications. Redeeming a reward and moving a redemption to
 * APPROVED/FULFILLED must notify the customer across their channels, without the
 * notification affecting the redemption result (fire-and-forget). REJECTED is
 * intentionally silent.
 */
describe('RewardsService notifications', () => {
  /** Drain the microtask + macrotask queue so fire-and-forget notifies run. */
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const admin: AuthenticatedUser = {
    id: 'admin-1',
    role: 'SUPER_ADMIN',
    regionId: null,
    outletId: null,
    permissions: [],
  };

  const activeReward = {
    id: 'r1',
    status: 'ACTIVE',
    type: 'MERCHANDISE',
    pointsCost: 500,
    perUserLimit: 1,
    remainingInventory: 10,
    validFrom: null,
    validUntil: null,
    campaignId: 'c1',
    name: 'Amstel Cooler',
  };

  function buildRedeemPrisma(reward: Record<string, unknown>): PrismaService {
    const tx = {
      reward: {
        findFirst: jest.fn().mockResolvedValue(reward),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rewardRedemption: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'rr-1', status: 'PENDING' }),
      },
      wallet: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ availablePoints: 1000n, redeemedPoints: 0n }),
        update: jest.fn().mockResolvedValue({ availablePoints: 500n }),
      },
      tournamentRegistration: { create: jest.fn().mockResolvedValue({}) },
      pointsTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    return {
      // redeem() outlet guard + notify-path reads (top-level, not tx)
      outlet: {
        findFirst: jest.fn().mockResolvedValue({ id: 'o1' }),
        findUnique: jest.fn().mockResolvedValue({ name: 'Kigali Bar' }),
      },
      reward: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ name: reward.name, type: reward.type }),
      },
      tournament: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Amstel Cup' }),
      },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

  it('notifies the customer when a reward is redeemed', async () => {
    const notifications = notificationsStub();
    const svc = makeService(buildRedeemPrisma(activeReward), notifications);

    await svc.redeem('u1', 'r1', { collectionOutletId: 'o1' });
    await flush();

    expect(notifications.notifyAllChannels).toHaveBeenCalledTimes(1);
    const [userId, payload] = (notifications.notifyAllChannels as jest.Mock).mock
      .calls[0];
    expect(userId).toBe('u1');
    expect(payload.body).toContain('Amstel Cooler');
    expect(payload.body).toContain('Kigali Bar');
  });

  it('confirms tournament registration for a tournament-entry reward', async () => {
    const notifications = notificationsStub();
    const reward = { ...activeReward, type: 'TOURNAMENT_ENTRY' };
    const svc = makeService(buildRedeemPrisma(reward), notifications);

    await svc.redeem('u1', 'r1', {
      collectionOutletId: 'o1',
      tournamentId: 't1',
    });
    await flush();

    expect(notifications.notifyAllChannels).toHaveBeenCalledTimes(1);
    const payload = (notifications.notifyAllChannels as jest.Mock).mock
      .calls[0][1];
    expect(payload.body).toContain('Amstel Cup');
  });

  it('still succeeds when the notification fails', async () => {
    const notifications = notificationsStub();
    (notifications.notifyAllChannels as jest.Mock).mockRejectedValue(
      new Error('sms provider down'),
    );
    const svc = makeService(buildRedeemPrisma(activeReward), notifications);

    const res = await svc.redeem('u1', 'r1', { collectionOutletId: 'o1' });
    await flush();

    expect(res.status).toBe('PENDING');
    expect(res.pointsSpent).toBe(500);
  });

  function buildStatusPrisma(status: string): {
    prisma: PrismaService;
    redemption: Record<string, unknown>;
  } {
    const redemption = {
      id: 'rr-1',
      userId: 'u1',
      rewardId: 'r1',
      collectionOutletId: 'o1',
      status,
    };
    const prisma = {
      rewardRedemption: {
        findUnique: jest.fn().mockResolvedValue(redemption),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'rr-1', ...data }),
          ),
      },
      reward: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Amstel Cooler' }),
      },
      outlet: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Kigali Bar' }),
      },
    } as unknown as PrismaService;
    return { prisma, redemption };
  }

  it('notifies the customer when a redemption is approved', async () => {
    const notifications = notificationsStub();
    const { prisma } = buildStatusPrisma('PENDING');
    const svc = makeService(prisma, notifications);

    await svc.approve('rr-1', admin.id);
    await flush();

    expect(notifications.notifyAllChannels).toHaveBeenCalledTimes(1);
    const [userId, payload] = (notifications.notifyAllChannels as jest.Mock).mock
      .calls[0];
    expect(userId).toBe('u1');
    expect(payload.body).toContain('Amstel Cooler');
  });

  it('notifies the customer when a redemption is fulfilled', async () => {
    const notifications = notificationsStub();
    const { prisma } = buildStatusPrisma('APPROVED');
    const svc = makeService(prisma, notifications);

    await svc.fulfill('rr-1', admin);
    await flush();

    expect(notifications.notifyAllChannels).toHaveBeenCalledTimes(1);
  });

  it('does NOT notify the customer when a redemption is rejected', async () => {
    const notifications = notificationsStub();
    const { prisma } = buildStatusPrisma('PENDING');
    const svc = makeService(prisma, notifications);

    await svc.reject('rr-1', admin.id);
    await flush();

    expect(notifications.notifyAllChannels).not.toHaveBeenCalled();
  });
});
