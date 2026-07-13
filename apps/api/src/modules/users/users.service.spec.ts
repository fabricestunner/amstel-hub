import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

/**
 * `remove` is a soft delete, but `email` and `phone` are unique columns. If the
 * deleted row keeps them, the person can never sign up again — the unique
 * constraint rejects the new row. Deleting must release the identifiers.
 */
describe('UsersService.remove', () => {
  const ACTOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TARGET = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  function build(target: Record<string, unknown>) {
    const userUpdate = jest.fn().mockResolvedValue({});
    const outletUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      user: { update: userUpdate },
      outlet: { update: outletUpdate },
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(target) },
      $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    return { service: new UsersService(prisma, audit), userUpdate, audit };
  }

  it('releases the phone and email so the person can register again', async () => {
    const { service, userUpdate } = build({
      id: TARGET,
      role: 'CUSTOMER',
      email: 'ivy@example.com',
      phone: '+250789921026',
      managedOutlet: null,
    });

    await service.remove(ACTOR, TARGET);

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET },
        data: expect.objectContaining({
          email: null,
          phone: null,
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('records the released identifiers in the audit log', async () => {
    const { service, audit } = build({
      id: TARGET,
      role: 'CUSTOMER',
      email: 'ivy@example.com',
      phone: '+250789921026',
      managedOutlet: null,
    });

    await service.remove(ACTOR, TARGET);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.delete',
        entityId: TARGET,
        before: { email: 'ivy@example.com', phone: '+250789921026' },
      }),
    );
  });
});
