import { PrismaService } from '../../common/prisma/prisma.service';
import { TournamentsService } from './tournaments.service';

/**
 * Unit tests for bracket sizing. We exercise the pure power-of-two rounding
 * (with the 32-player cap) that drives bracket generation. Prisma is not
 * touched here.
 */
describe('TournamentsService.bracketSize', () => {
  const svc = new TournamentsService({} as unknown as PrismaService);
  // bracketSize is an internal helper; cast to reach it for focused testing.
  const size = (n: number): number =>
    (svc as unknown as { bracketSize(n: number): number }).bracketSize(n);

  it('rounds up to the next power of two', () => {
    expect(size(2)).toBe(2);
    expect(size(3)).toBe(4);
    expect(size(5)).toBe(8);
    expect(size(8)).toBe(8);
    expect(size(9)).toBe(16);
    expect(size(16)).toBe(16);
    expect(size(17)).toBe(32);
  });

  it('caps at 32 players', () => {
    expect(size(33)).toBe(32);
    expect(size(64)).toBe(32);
  });
});

/**
 * Registrant listing scoping: admins see every registration, while an
 * OUTLET_MANAGER is restricted to registrations made representing their own
 * outlet (the registration's outletId).
 */
describe('TournamentsService.getRegistrants', () => {
  const registration = {
    id: 'reg-1',
    userId: 'user-1',
    outletId: 'outlet-1',
    pointsSpent: 100,
    status: 'REGISTERED',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    user: {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+250700000000',
    },
    outlet: { id: 'outlet-1', name: 'Kigali Bar', code: 'KGL-001' },
  };

  const makePrisma = () => ({
    tournament: {
      findFirst: jest.fn().mockResolvedValue({ id: 't-1', deletedAt: null }),
    },
    tournamentRegistration: {
      findMany: jest.fn().mockResolvedValue([registration]),
    },
  });

  const asUser = (role: string, outletId: string | null = null) =>
    ({
      id: 'caller-1',
      role,
      regionId: null,
      outletId,
      permissions: [],
    }) as never;

  it('returns all registrants unfiltered for admin roles', async () => {
    const prisma = makePrisma();
    const svc = new TournamentsService(prisma as unknown as PrismaService);

    const result = await svc.getRegistrants('t-1', asUser('SUPER_ADMIN'));

    expect(prisma.tournamentRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tournamentId: 't-1' } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userName: 'Jane Doe',
      userEmail: 'jane@example.com',
      userPhone: '+250700000000',
      outletName: 'Kigali Bar',
      pointsSpent: 100,
      status: 'REGISTERED',
    });
  });

  it('filters registrants to the manager outlet for OUTLET_MANAGER', async () => {
    const prisma = makePrisma();
    const svc = new TournamentsService(prisma as unknown as PrismaService);

    await svc.getRegistrants('t-1', asUser('OUTLET_MANAGER', 'outlet-1'));

    expect(prisma.tournamentRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 't-1', outletId: 'outlet-1' },
      }),
    );
  });

  it('matches no registrations when an OUTLET_MANAGER has no outlet', async () => {
    const prisma = makePrisma();
    const svc = new TournamentsService(prisma as unknown as PrismaService);

    await svc.getRegistrants('t-1', asUser('OUTLET_MANAGER', null));

    expect(prisma.tournamentRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 't-1', outletId: '__none__' },
      }),
    );
  });
});
