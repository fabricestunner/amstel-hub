import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RewardsService } from './rewards.service';

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
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

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

  it('throws when reward does not exist', async () => {
    const svc = new RewardsService(buildPrisma({ reward: null }));
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(NotFoundException);
  });

  it('throws when reward is not ACTIVE', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, status: 'INACTIVE' } }),
    );
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when out of stock', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, remainingInventory: 0 } }),
    );
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(ConflictException);
  });

  it('throws when per-user limit reached', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: activeReward, priorClaims: 1 }),
    );
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(ConflictException);
  });

  it('throws when tournament entry has no tournamentId', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, type: 'TOURNAMENT_ENTRY' } }),
    );
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when wallet has insufficient points', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: activeReward, wallet: { availablePoints: 100n } }),
    );
    await expect(svc.redeem('u1', 'r1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debits the wallet on the happy path', async () => {
    const svc = new RewardsService(buildPrisma({ reward: activeReward }));
    const res = await svc.redeem('u1', 'r1', {});
    expect(res.pointsSpent).toBe(500);
    expect(res.availablePoints).toBe(500);
    expect(res.status).toBe('PENDING');
  });
});
