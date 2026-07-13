import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListVouchersDto } from './dto/voucher.dto';
import { VouchersService } from './vouchers.service';

/**
 * Prisma is mocked. These tests pin the business rules of the voucher archive:
 * a void is never a hard delete, a redeemed voucher can never be voided, and
 * nothing that reaches the client leaks the raw redeemable code.
 */
describe('VouchersService', () => {
  function buildAudit() {
    return { record: jest.fn().mockResolvedValue(undefined) } as unknown as
      AuditService & { record: jest.Mock };
  }

  function query(overrides: Partial<ListVouchersDto> = {}): ListVouchersDto {
    return Object.assign(new ListVouchersDto(), overrides);
  }

  describe('void', () => {
    function buildPrisma(voucher: unknown) {
      const update = jest.fn().mockResolvedValue({});
      const prisma = {
        loyaltyCode: {
          findUnique: jest.fn().mockResolvedValue(voucher),
          update,
        },
      } as unknown as PrismaService;
      return { prisma, update };
    }

    it('sets an ACTIVE voucher to VOID', async () => {
      const { prisma, update } = buildPrisma({ id: 'v1', status: 'ACTIVE' });
      const audit = buildAudit();
      const service = new VouchersService(prisma, audit);

      const result = await service.void('v1', 'admin-1');

      expect(update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { status: 'VOID' },
      });
      expect(result).toEqual({ id: 'v1', status: 'VOID' });
    });

    it('records the void in the audit log', async () => {
      const { prisma } = buildPrisma({ id: 'v1', status: 'ACTIVE' });
      const audit = buildAudit();
      const service = new VouchersService(prisma, audit);

      await service.void('v1', 'admin-1');

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'voucher.void',
          entityId: 'v1',
          after: { status: 'VOID' },
        }),
      );
    });

    it('refuses to void a REDEEMED voucher (409) and leaves it untouched', async () => {
      const { prisma, update } = buildPrisma({ id: 'v1', status: 'REDEEMED' });
      const audit = buildAudit();
      const service = new VouchersService(prisma, audit);

      await expect(service.void('v1', 'admin-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      // The customer's points derive from the redemption — nothing may change.
      expect(update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('throws 404 when the voucher does not exist', async () => {
      const { prisma } = buildPrisma(null);
      const service = new VouchersService(prisma, buildAudit());

      await expect(service.void('nope', 'admin-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('voidBatch', () => {
    it('voids only the ACTIVE codes and reports voided vs skipped', async () => {
      // Batch of 10: 6 ACTIVE (voided), 4 redeemed/expired/void (skipped).
      const updateMany = jest.fn().mockResolvedValue({ count: 6 });
      const prisma = {
        loyaltyCode: {
          count: jest.fn().mockResolvedValue(10),
          updateMany,
        },
      } as unknown as PrismaService;
      const service = new VouchersService(prisma, buildAudit());

      const result = await service.voidBatch('batch-1', 'admin-1');

      // The status filter is what protects redeemed codes from being voided.
      expect(updateMany).toHaveBeenCalledWith({
        where: { batchId: 'batch-1', status: 'ACTIVE' },
        data: { status: 'VOID' },
      });
      expect(result).toEqual({ batchId: 'batch-1', voided: 6, skipped: 4 });
    });

    it('throws 404 when the batch has no codes at all', async () => {
      const prisma = {
        loyaltyCode: {
          count: jest.fn().mockResolvedValue(0),
          updateMany: jest.fn(),
        },
      } as unknown as PrismaService;
      const service = new VouchersService(prisma, buildAudit());

      await expect(
        service.voidBatch('ghost', 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    const row = {
      id: 'abc12345-0000-0000-0000-000000000000',
      type: 'QR',
      status: 'REDEEMED',
      pointsValue: 20,
      batchId: 'batch-1',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      campaign: { name: 'Summer Promo' },
      outlet: { name: 'Pili Pili Bar' },
      redemption: {
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        user: { firstName: 'Ada', lastName: 'Lovelace' },
      },
    };

    function buildPrisma(rows: unknown[] = [row]) {
      const findMany = jest.fn().mockResolvedValue(rows);
      const groupBy = jest.fn().mockResolvedValue([
        { status: 'ACTIVE', _count: { _all: 3 } },
        { status: 'REDEEMED', _count: { _all: 2 } },
        { status: 'EXPIRED', _count: { _all: 1 } },
        { status: 'VOID', _count: { _all: 4 } },
      ]);
      const prisma = {
        loyaltyCode: {
          findMany,
          count: jest.fn().mockResolvedValue(rows.length),
          groupBy,
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      } as unknown as PrismaService;
      return { prisma, findMany, groupBy };
    }

    it('serializes a voucher to the wire shape', async () => {
      const { prisma } = buildPrisma();
      const service = new VouchersService(prisma, buildAudit());

      const result = await service.list(query());

      expect(result.items[0]).toEqual({
        id: row.id,
        reference: 'VCH-ABC12345',
        type: 'QR',
        status: 'REDEEMED',
        points: 20,
        campaign: 'Summer Promo',
        outlet: 'Pili Pili Bar',
        batchId: 'batch-1',
        expiresAt: '2026-12-31T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        redeemedAt: '2026-02-01T00:00:00.000Z',
        redeemedBy: 'Ada Lovelace',
      });
    });

    it('is JSON-serializable and never leaks codeHash/codeCipher', async () => {
      // A real Prisma row carries the encrypted code; the select must drop it.
      const rawish = {
        ...row,
        codeHash: 'sha256-hash',
        codeCipher: 'aes-encrypted-secret',
      };
      const { prisma } = buildPrisma([rawish]);
      const service = new VouchersService(prisma, buildAudit());

      const result = await service.list(query());

      // Express calls JSON.stringify on every response.
      const json = JSON.stringify(result);
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).not.toContain('codeHash');
      expect(json).not.toContain('codeCipher');
      expect(json).not.toContain('aes-encrypted-secret');
      expect(json).not.toContain('sha256-hash');
    });

    it('counts every status bucket', async () => {
      const { prisma } = buildPrisma();
      const service = new VouchersService(prisma, buildAudit());

      const result = await service.list(query());

      expect(result.counts).toEqual({
        total: 10,
        active: 3,
        redeemed: 2,
        expired: 1,
        void: 4,
      });
    });

    it('counts ignore the status filter but honour the other filters', async () => {
      const { prisma, findMany, groupBy } = buildPrisma();
      const service = new VouchersService(prisma, buildAudit());

      await service.list(
        query({ status: 'ACTIVE', campaignId: 'camp-1', type: 'QR' }),
      );

      // Rows are filtered by status...
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            campaignId: 'camp-1',
            type: 'QR',
          }),
        }),
      );
      // ...but the chip counts are not, or selecting a chip would zero the others.
      const groupByWhere = groupBy.mock.calls[0][0].where;
      expect(groupByWhere).toEqual({ campaignId: 'camp-1', type: 'QR' });
      expect(groupByWhere.status).toBeUndefined();
    });

    it('searches the VCH- reference by prefix-matching the uuid', async () => {
      const { prisma, findMany } = buildPrisma();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: row.id }]);
      const service = new VouchersService(prisma, buildAudit());

      await service.list(query({ search: 'VCH-ABC12345' }));

      expect(prisma.$queryRaw).toHaveBeenCalled();
      const where = findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([{ id: { in: [row.id] } }]),
      );
    });

    it('falls back to campaign/outlet name search for a non-hex term', async () => {
      const { prisma, findMany } = buildPrisma();
      const service = new VouchersService(prisma, buildAudit());

      await service.list(query({ search: 'Summer' }));

      // Not hex, so no uuid prefix query is issued.
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(findMany.mock.calls[0][0].where.OR).toEqual([
        { campaign: { name: { contains: 'Summer', mode: 'insensitive' } } },
        { outlet: { name: { contains: 'Summer', mode: 'insensitive' } } },
      ]);
    });
  });
});
