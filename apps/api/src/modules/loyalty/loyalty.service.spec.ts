import { ConflictException, NotFoundException } from '@nestjs/common';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoyaltyService } from './loyalty.service';

/**
 * Unit tests for the redemption core. Prisma is mocked; we assert the
 * business rules (invalid code, already-redeemed, happy path) rather than DB
 * behaviour. The serializable-transaction guarantee is covered by e2e tests.
 */
describe('LoyaltyService.redeemCode', () => {
  const crypto = { hash: (v: string) => `h:${v}` } as unknown as CryptoService;

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
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
  }

  const ctx = { ipAddress: '1.1.1.1', userAgent: 'jest' };
  const dto = { code: 'amstel-code' };

  it('throws when the code does not exist', async () => {
    const service = new LoyaltyService(buildPrisma(null), crypto);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when the code is already redeemed', async () => {
    const code = { id: 'c1', status: 'REDEEMED', campaign: { status: 'ACTIVE' } };
    const service = new LoyaltyService(buildPrisma(code), crypto);
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
    const service = new LoyaltyService(buildPrisma(code), crypto);
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
    const service = new LoyaltyService(buildPrisma(code, 0), crypto);
    await expect(service.redeemCode('u1', dto, ctx)).rejects.toThrow(
      ConflictException,
    );
  });
});
