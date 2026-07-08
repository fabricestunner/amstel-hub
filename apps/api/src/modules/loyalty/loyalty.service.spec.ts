import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { LoyaltyService } from './loyalty.service';

/**
 * Unit tests for the redemption core. Prisma is mocked; we assert the
 * business rules (invalid code, already-redeemed, happy path) rather than DB
 * behaviour. The serializable-transaction guarantee is covered by e2e tests.
 */
describe('LoyaltyService.redeemCode', () => {
  const crypto = { hash: (v: string) => `h:${v}` } as unknown as CryptoService;
  // Fraud check returns false (not abusive) for all redemption-rule tests.
  const fraud = {
    checkRedemptionVelocity: jest.fn().mockResolvedValue(false),
  } as unknown as FraudService;
  // Notifications are fired non-blocking after redemption; stub them out.
  const notifications = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as import('../notifications/notifications.service').NotificationsService;

  function buildPrisma(code: unknown, claimedCount = 1): PrismaService {
    const tx = {
      loyaltyCode: {
        findUnique: jest.fn().mockResolvedValue(code),
        updateMany: jest.fn().mockResolvedValue({ count: claimedCount }),
      },
      codeRedemption: { create: jest.fn().mockResolvedValue({ id: 'red-1' }) },
      wallet: { update: jest.fn().mockResolvedValue({ availablePoints: 120n }) },
      pointsTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    return {
      outlet: { findUnique: jest.fn().mockResolvedValue(null) },
      // Default redeemer: a plain customer with no assigned outlet.
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: 'CUSTOMER', assignedOutletId: null }),
      },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

  const ctx = { ipAddress: '1.1.1.1', userAgent: 'jest' };
  const dto = { code: 'amstel-code' };

  it('throws when the code does not exist', async () => {
    const service = new LoyaltyService(buildPrisma(null), crypto, fraud, notifications);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when the code is already redeemed', async () => {
    const code = { id: 'c1', status: 'REDEEMED', campaign: { status: 'ACTIVE' } };
    const service = new LoyaltyService(buildPrisma(code), crypto, fraud, notifications);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toThrow(
      ConflictException,
    );
  });

  it('credits points on the happy path', async () => {
    const code = {
      id: 'c1',
      status: 'ACTIVE',
      pointsValue: 20,
      type: 'QR',
      campaignId: 'camp1',
      expiresAt: null,
      campaign: { status: 'ACTIVE', name: 'Summer Promo' },
    };
    const service = new LoyaltyService(buildPrisma(code), crypto, fraud, notifications);
    const result = await service.redeemCode('u1', dto, ctx);
    expect(result.pointsEarned).toBe(20);
    expect(result.availablePoints).toBe(120);
    expect(result.campaign).toBe('Summer Promo');
  });

  it('throws if the atomic claim loses the race', async () => {
    const code = {
      id: 'c1',
      status: 'ACTIVE',
      pointsValue: 20,
      type: 'QR',
      campaignId: 'camp1',
      expiresAt: null,
      campaign: { status: 'ACTIVE', name: 'Summer Promo' },
    };
    const service = new LoyaltyService(buildPrisma(code, 0), crypto, fraud, notifications);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toThrow(
      ConflictException,
    );
  });

  it('attributes the redemption to the voucher own outlet when no outletCode is given', async () => {
    const code = {
      id: 'c1',
      status: 'ACTIVE',
      pointsValue: 20,
      type: 'QR',
      campaignId: 'camp1',
      outletId: 'outlet-99',
      expiresAt: null,
      campaign: { status: 'ACTIVE', name: 'Summer Promo' },
    };
    const redemptionCreate = jest.fn().mockResolvedValue({ id: 'red-1' });
    const txCreate = jest.fn().mockResolvedValue({});
    const tx = {
      loyaltyCode: {
        findUnique: jest.fn().mockResolvedValue(code),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      codeRedemption: { create: redemptionCreate },
      wallet: { update: jest.fn().mockResolvedValue({ availablePoints: 120n }) },
      pointsTransaction: { create: txCreate },
    };
    const prisma = {
      // No outletCode → outlet lookup is skipped (returns null).
      outlet: { findUnique: jest.fn().mockResolvedValue(null) },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: 'CUSTOMER', assignedOutletId: null }),
      },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    const service = new LoyaltyService(prisma, crypto, fraud, notifications);
    await service.redeemCode('u1', dto, ctx);

    expect(redemptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outletId: 'outlet-99' }),
      }),
    );
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outletId: 'outlet-99' }),
      }),
    );
  });

  it('forbids a promoter from redeeming a voucher at their own outlet', async () => {
    const code = {
      id: 'c1',
      status: 'ACTIVE',
      pointsValue: 20,
      type: 'QR',
      campaignId: 'camp1',
      outletId: 'outlet-99',
      expiresAt: null,
      campaign: { status: 'ACTIVE', name: 'Summer Promo' },
    };
    const prisma = buildPrisma(code);
    // Redeemer is a promoter assigned to the SAME outlet the voucher belongs to.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'PROMOTER',
      assignedOutletId: 'outlet-99',
    });
    const service = new LoyaltyService(prisma, crypto, fraud, notifications);
    await expect(service.redeemCode('promo-1', dto, ctx)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets a promoter redeem a voucher from a different outlet', async () => {
    const code = {
      id: 'c1',
      status: 'ACTIVE',
      pointsValue: 20,
      type: 'QR',
      campaignId: 'camp1',
      outletId: 'outlet-OTHER',
      expiresAt: null,
      campaign: { status: 'ACTIVE', name: 'Summer Promo' },
    };
    const prisma = buildPrisma(code);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'PROMOTER',
      assignedOutletId: 'outlet-99',
    });
    const service = new LoyaltyService(prisma, crypto, fraud, notifications);
    const result = await service.redeemCode('promo-1', dto, ctx);
    expect(result.pointsEarned).toBe(20);
  });

  it('blocks redemption (429) when fraud velocity is exceeded', async () => {
    const abusiveFraud = {
      checkRedemptionVelocity: jest.fn().mockResolvedValue(true),
    } as unknown as FraudService;
    const prisma = buildPrisma(null);
    const service = new LoyaltyService(prisma, crypto, abusiveFraud, notifications);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toMatchObject({
      status: 429,
    });
    // Should short-circuit before touching the database.
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
