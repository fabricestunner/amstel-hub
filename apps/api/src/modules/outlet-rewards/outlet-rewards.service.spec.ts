import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOutletRewardDto,
  ListOutletRewardsDto,
} from './dto/outlet-reward.dto';
import { OutletRewardsService } from './outlet-rewards.service';

const notifications = {
  notifyAllChannels: jest.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

describe('OutletRewardsService.create/list', () => {
  const dto: CreateOutletRewardDto = {
    name: '25 Crates of Amstel Beer',
    pointsCost: 300,
    totalInventory: 10,
  };

  it('creates a reward with remainingInventory seeded from totalInventory', async () => {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r1', ...data }));
    const prisma = { outletReward: { create } } as unknown as PrismaService;
    const service = new OutletRewardsService(prisma, notifications);

    await service.create(dto);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: dto.name,
        pointsCost: 300,
        totalInventory: 10,
        remainingInventory: 10,
      }),
    });
  });

  it('lists ACTIVE, non-deleted rewards paginated', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'r1', name: 'Reward' }]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = { outletReward: { findMany, count } } as unknown as PrismaService;
    const service = new OutletRewardsService(prisma, notifications);

    const result = await service.list(Object.assign(new ListOutletRewardsDto(), { page: 1, limit: 20 }));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, status: 'ACTIVE' },
      }),
    );
    expect(result.items).toEqual([{ id: 'r1', name: 'Reward' }]);
  });
});

describe('OutletRewardsService.redeem', () => {
  const OUTLET_ID = 'outlet-1';
  const REWARD_ID = 'reward-1';
  const MANAGER_ID = 'mgr-1';

  function buildPrisma(opts: {
    reward: unknown;
    outletAvailablePoints: bigint;
    claimedCount?: number;
  }): PrismaService {
    const tx = {
      outletReward: {
        findFirst: jest.fn().mockResolvedValue(opts.reward),
        updateMany: jest.fn().mockResolvedValue({ count: opts.claimedCount ?? 1 }),
      },
      outlet: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: OUTLET_ID, availablePoints: opts.outletAvailablePoints }),
        update: jest.fn().mockResolvedValue({
          availablePoints: opts.outletAvailablePoints - BigInt((opts.reward as { pointsCost: number })?.pointsCost ?? 0),
        }),
      },
      outletRewardRedemption: {
        create: jest.fn().mockResolvedValue({ id: 'redemption-1', status: 'PENDING' }),
      },
    };
    return {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

  it('throws BadRequestException when the outlet has insufficient points', async () => {
    const prisma = buildPrisma({
      reward: { id: REWARD_ID, status: 'ACTIVE', pointsCost: 300, validFrom: null, validUntil: null, remainingInventory: null },
      outletAvailablePoints: 100n,
    });
    const service = new OutletRewardsService(prisma, notifications);

    await expect(
      service.redeem(OUTLET_ID, REWARD_ID, MANAGER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when out of stock', async () => {
    const prisma = buildPrisma({
      reward: { id: REWARD_ID, status: 'ACTIVE', pointsCost: 300, validFrom: null, validUntil: null, remainingInventory: 0 },
      outletAvailablePoints: 1000n,
    });
    const service = new OutletRewardsService(prisma, notifications);

    await expect(
      service.redeem(OUTLET_ID, REWARD_ID, MANAGER_ID),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when the atomic inventory claim loses the race', async () => {
    const prisma = buildPrisma({
      reward: { id: REWARD_ID, status: 'ACTIVE', pointsCost: 300, validFrom: null, validUntil: null, remainingInventory: 5 },
      outletAvailablePoints: 1000n,
      claimedCount: 0,
    });
    const service = new OutletRewardsService(prisma, notifications);

    await expect(
      service.redeem(OUTLET_ID, REWARD_ID, MANAGER_ID),
    ).rejects.toThrow(ConflictException);
  });

  it('decrements availablePoints (not totalPoints) on the happy path', async () => {
    const prisma = buildPrisma({
      reward: { id: REWARD_ID, status: 'ACTIVE', pointsCost: 300, validFrom: null, validUntil: null, remainingInventory: null },
      outletAvailablePoints: 1000n,
    });
    const service = new OutletRewardsService(prisma, notifications);

    const result = await service.redeem(OUTLET_ID, REWARD_ID, MANAGER_ID);

    expect(result.pointsSpent).toBe(300);
    expect(result.availablePoints).toBe(700);
  });
});

/**
 * Editing a reward's total stock must keep remainingInventory in step, and an
 * explicit `null` (the UI's "clear the stock field" signal) must clear the
 * cap back to unlimited rather than being run through the delta arithmetic.
 */
describe('OutletRewardsService.update inventory', () => {
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
      outletReward: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update,
      },
    } as unknown as PrismaService;
    return { prisma, update };
  }

  it('clears totalInventory and remainingInventory to null when totalInventory is explicitly null', async () => {
    const { prisma, update } = buildPrisma({
      id: 'r1',
      totalInventory: 500,
      remainingInventory: 100,
    });
    const service = new OutletRewardsService(prisma, notifications);

    await service.update('r1', { totalInventory: null } as never);

    const data = update.mock.calls[0][0].data;
    expect(data.totalInventory).toBeNull();
    expect(data.remainingInventory).toBeNull();
  });
});
