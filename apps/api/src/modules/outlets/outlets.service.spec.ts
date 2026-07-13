import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOutletDto } from './dto/outlet.dto';
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
