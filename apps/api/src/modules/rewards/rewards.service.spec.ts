import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListRedemptionsDto } from './dto/reward.dto';
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
    const svc = new RewardsService(
      buildPrisma({ reward: activeReward, outlet: null }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when reward does not exist', async () => {
    const svc = new RewardsService(buildPrisma({ reward: null }));
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(NotFoundException);
  });

  it('throws when reward is not ACTIVE', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, status: 'INACTIVE' } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when out of stock', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, remainingInventory: 0 } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(ConflictException);
  });

  it('throws when per-user limit reached', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: activeReward, priorClaims: 1 }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(ConflictException);
  });

  it('throws when tournament entry has no tournamentId', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: { ...activeReward, type: 'TOURNAMENT_ENTRY' } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when wallet has insufficient points', async () => {
    const svc = new RewardsService(
      buildPrisma({ reward: activeReward, wallet: { availablePoints: 100n } }),
    );
    await expect(svc.redeem('u1', 'r1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debits the wallet on the happy path', async () => {
    const svc = new RewardsService(buildPrisma({ reward: activeReward }));
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
      const svc = new RewardsService(prisma);
      await svc.listRedemptions(listQuery, admin);
      const args = (prisma.rewardRedemption.findMany as jest.Mock).mock
        .calls[0][0];
      expect(args.where.collectionOutletId).toBeUndefined();
    });

    it('force-filters OUTLET_MANAGER to their outlet', async () => {
      const prisma = buildPrisma(null);
      const svc = new RewardsService(prisma);
      await svc.listRedemptions(listQuery, outletManager);
      const args = (prisma.rewardRedemption.findMany as jest.Mock).mock
        .calls[0][0];
      expect(args.where.collectionOutletId).toBe('o1');
    });

    it('matches nothing when an OUTLET_MANAGER has no outlet', async () => {
      const prisma = buildPrisma(null);
      const svc = new RewardsService(prisma);
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
      const svc = new RewardsService(prisma);
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
      const svc = new RewardsService(prisma);
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
      const svc = new RewardsService(prisma);
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
      const svc = new RewardsService(prisma);
      const res = await svc.fulfill('rr-1', outletManager);
      expect(res.status).toBe('FULFILLED');
    });

    it('rejects an OUTLET_MANAGER fulfilling a rejected redemption', async () => {
      const prisma = buildPrisma({
        id: 'rr-1',
        status: 'REJECTED',
        collectionOutletId: 'o1',
      });
      const svc = new RewardsService(prisma);
      await expect(svc.fulfill('rr-1', outletManager)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('404s when the redemption does not exist', async () => {
      const prisma = buildPrisma(null);
      const svc = new RewardsService(prisma);
      await expect(svc.fulfill('missing', outletManager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
