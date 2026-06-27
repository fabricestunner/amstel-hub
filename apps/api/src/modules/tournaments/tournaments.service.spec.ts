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
