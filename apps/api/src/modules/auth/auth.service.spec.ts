import { ConflictException } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

/**
 * Re-registration after a soft delete. Two things have to hold:
 *  - a soft-deleted row must not count as "already registered";
 *  - the unique phone/email it still occupies must be released before the
 *    insert, or `user.create` dies on the unique constraint (P2002).
 */
describe('AuthService.register after soft delete', () => {
  const PHONE = '+250789921026';

  function build(existing: unknown) {
    const created = { id: 'new-user-id', phone: PHONE, email: null };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue(created);
    const tx = { user: { updateMany, create } };
    const findFirst = jest.fn().mockResolvedValue(existing);

    const prisma = {
      user: { findFirst, create, updateMany },
      outlet: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;

    const otp = { issue: jest.fn().mockResolvedValue(undefined) } as unknown as OtpService;
    const tokens = {} as TokenService;

    return {
      service: new AuthService(prisma, tokens, otp),
      findFirst,
      updateMany,
      create,
    };
  }

  const dto = { phone: PHONE, password: 'Password123!', firstName: 'B', lastName: 'Ivy' };

  it('still rejects a phone held by a LIVE account', async () => {
    const { service } = build({ id: 'live-user', deletedAt: null });

    await expect(service.register(dto as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('only checks live accounts for duplicates', async () => {
    const { service, findFirst } = build(null);

    await service.register(dto as never);

    // A soft-deleted holder must not trip the "already registered" check.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('releases the phone off a soft-deleted account before inserting', async () => {
    const { service, updateMany, create } = build(null);

    await service.register(dto as never);

    expect(updateMany).toHaveBeenCalledWith({
      where: { phone: PHONE, deletedAt: { not: null } },
      data: { phone: null },
    });
    expect(create).toHaveBeenCalled();
  });
});
