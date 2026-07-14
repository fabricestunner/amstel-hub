import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOutletDto, ListOutletsDto } from './dto/outlet.dto';
import { OutletsService } from './outlets.service';

/**
 * Prisma is mocked. These tests pin the contract of the write path: whatever
 * `create`/`update` hand back must survive `JSON.stringify` (Express calls it
 * on every response) and must carry the same shape `list` returns.
 */
describe('OutletsService write path', () => {
  const dto: CreateOutletDto = {
    name: 'Pili Pili Bar',
    code: 'OUT-KGL-001',
    regionId: '11111111-1111-1111-1111-111111111111',
    provinceId: '22222222-2222-2222-2222-222222222222',
    districtId: '33333333-3333-3333-3333-333333333333',
  };

  /** Mirrors what `prisma.outlet.create` really returns for a fresh row. */
  function createdRow() {
    return {
      id: '44444444-4444-4444-4444-444444444444',
      name: dto.name,
      code: dto.code,
      status: 'ACTIVE',
      address: null,
      latitude: null,
      longitude: null,
      regionId: dto.regionId,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      managerId: null,
      totalSales: new Prisma.Decimal(0),
      totalPoints: BigInt(0),
      customerCount: 0,
      nationalRank: null,
      regionalRank: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      region: { id: dto.regionId, name: 'Kigali' },
      province: { id: dto.provinceId, name: 'Kigali City' },
      district: { id: dto.districtId, name: 'Gasabo' },
    };
  }

  function buildPrisma(create: jest.Mock): PrismaService {
    return { outlet: { create } } as unknown as PrismaService;
  }

  it('returns a JSON-serializable outlet (BigInt totalPoints must not escape)', async () => {
    const service = new OutletsService(
      buildPrisma(jest.fn().mockResolvedValue(createdRow())),
    );

    const result = await service.create(dto);

    // Express serializes every response with JSON.stringify, which throws
    // "Do not know how to serialize a BigInt" if a raw BigInt leaks through.
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('returns the same serialized shape as list()', async () => {
    const service = new OutletsService(
      buildPrisma(jest.fn().mockResolvedValue(createdRow())),
    );

    const result = await service.create(dto);

    expect(result).toMatchObject({
      id: '44444444-4444-4444-4444-444444444444',
      region: 'Kigali',
      province: 'Kigali City',
      district: 'Gasabo',
      status: 'active',
      pointsGenerated: 0,
      customers: 0,
    });
  });

  it('maps a duplicate outlet code to a 409 instead of a 500', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`code`)',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['code'] } },
    );
    const service = new OutletsService(
      buildPrisma(jest.fn().mockRejectedValue(duplicate)),
    );

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps an already-assigned manager to a 409 instead of a 500', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`managerId`)',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['managerId'] } },
    );
    const service = new OutletsService(
      buildPrisma(jest.fn().mockRejectedValue(duplicate)),
    );

    await expect(
      service.create({ ...dto, managerId: '55555555-5555-5555-5555-555555555555' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

/**
 * `Outlet.totalPoints` / `customerCount` are denormalized columns that are
 * never written, so `list()` must derive points and distinct customers live
 * from code redemptions — in a fixed number of grouped queries, not per row.
 */
describe('OutletsService list aggregation', () => {
  const OUTLET_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const OUTLET_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const admin: AuthenticatedUser = {
    id: '99999999-9999-9999-9999-999999999999',
    role: 'SUPER_ADMIN',
    regionId: null,
    outletId: null,
    permissions: [],
  };

  function outletRow(id: string, name: string) {
    return {
      id,
      name,
      code: `OUT-${name.toUpperCase()}`,
      status: 'ACTIVE',
      address: null,
      latitude: null,
      longitude: null,
      regionId: '11111111-1111-1111-1111-111111111111',
      provinceId: '22222222-2222-2222-2222-222222222222',
      districtId: '33333333-3333-3333-3333-333333333333',
      managerId: null,
      totalSales: new Prisma.Decimal(0),
      totalPoints: BigInt(0), // stale — must NOT be what list() reports
      customerCount: 0, // stale — must NOT be what list() reports
      nationalRank: null,
      regionalRank: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      region: { id: '11111111-1111-1111-1111-111111111111', name: 'Kigali' },
      province: { id: '22222222-2222-2222-2222-222222222222', name: 'Kigali City' },
      district: { id: '33333333-3333-3333-3333-333333333333', name: 'Gasabo' },
    };
  }

  function buildPrisma(groupBy: jest.Mock): PrismaService {
    return {
      outlet: {
        findMany: jest
          .fn()
          .mockResolvedValue([outletRow(OUTLET_A, 'A'), outletRow(OUTLET_B, 'B')]),
        count: jest.fn().mockResolvedValue(2),
      },
      codeRedemption: { groupBy },
    } as unknown as PrismaService;
  }

  /** Answers both grouped queries list() issues, keyed on the `by` clause. */
  function groupByMock() {
    return jest.fn().mockImplementation(({ by }: { by: string[] }) => {
      if (by.length === 1) {
        // groupBy(['outletId']) — points sums
        return Promise.resolve([
          { outletId: OUTLET_A, _sum: { points: 150 } },
          { outletId: OUTLET_B, _sum: { points: 40 } },
        ]);
      }
      // groupBy(['outletId', 'userId']) — one row per distinct customer
      return Promise.resolve([
        { outletId: OUTLET_A, userId: 'u1' },
        { outletId: OUTLET_A, userId: 'u2' },
        { outletId: OUTLET_A, userId: 'u3' },
        { outletId: OUTLET_B, userId: 'u1' },
      ]);
    });
  }

  it('reports live points and distinct customers instead of the stale columns', async () => {
    const service = new OutletsService(buildPrisma(groupByMock()));

    const result = await service.list(new ListOutletsDto(), admin);

    expect(result.items).toEqual([
      expect.objectContaining({ id: OUTLET_A, pointsGenerated: 150, customers: 3 }),
      expect.objectContaining({ id: OUTLET_B, pointsGenerated: 40, customers: 1 }),
    ]);
  });

  it('issues exactly two grouped queries for the whole page (no N+1)', async () => {
    const groupBy = groupByMock();
    const service = new OutletsService(buildPrisma(groupBy));

    await service.list(new ListOutletsDto(), admin);

    expect(groupBy).toHaveBeenCalledTimes(2);
  });

  it('falls back to zero for outlets with no redemptions', async () => {
    const groupBy = jest.fn().mockResolvedValue([]);
    const service = new OutletsService(buildPrisma(groupBy));

    const result = await service.list(new ListOutletsDto(), admin);

    expect(result.items).toEqual([
      expect.objectContaining({ id: OUTLET_A, pointsGenerated: 0, customers: 0 }),
      expect.objectContaining({ id: OUTLET_B, pointsGenerated: 0, customers: 0 }),
    ]);
    // And the payload must still be JSON-serializable (BigInt must not leak).
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
