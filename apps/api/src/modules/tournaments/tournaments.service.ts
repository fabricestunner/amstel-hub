import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TournamentStage, TournamentStatus } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateTournamentDto,
  ListTournamentsDto,
  MatchResultDto,
  UpdateTournamentDto,
} from './dto/tournament.dto';

/** Bracket size (power of 2) → the stage its first round represents. */
const SIZE_TO_STAGE: Record<number, TournamentStage> = {
  32: 'ROUND_OF_32',
  16: 'ROUND_OF_16',
  8: 'QUARTER_FINAL',
  4: 'SEMI_FINAL',
  2: 'FINAL',
};

const STATUS_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTournamentsDto) {
    const where: Prisma.TournamentWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { startsAt: query.sortOrder },
      }),
      this.prisma.tournament.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  /** Public: tournaments currently open for registration. */
  async listOpen() {
    return this.prisma.tournament.findMany({
      where: { deletedAt: null, status: 'REGISTRATION_OPEN' },
      orderBy: { registrationDeadline: 'asc' },
    });
  }

  async findById(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, deletedAt: null },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        campaignId: dto.campaignId,
        name: dto.name,
        description: dto.description,
        venue: dto.venue,
        city: dto.city,
        maxPlayers: dto.maxPlayers,
        entryPointsCost: dto.entryPointsCost ?? 0,
        registrationDeadline: new Date(dto.registrationDeadline),
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateTournamentDto) {
    await this.findById(id);
    const data: Prisma.TournamentUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.maxPlayers !== undefined ? { maxPlayers: dto.maxPlayers } : {}),
      ...(dto.entryPointsCost !== undefined
        ? { entryPointsCost: dto.entryPointsCost }
        : {}),
      ...(dto.registrationDeadline !== undefined
        ? { registrationDeadline: new Date(dto.registrationDeadline) }
        : {}),
      ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined
        ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }
        : {}),
      ...(dto.campaignId !== undefined
        ? { campaign: { connect: { id: dto.campaignId } } }
        : {}),
    };
    return this.prisma.tournament.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: TournamentStatus) {
    const tournament = await this.findById(id);
    if (tournament.status === status) return tournament;
    if (!STATUS_TRANSITIONS[tournament.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition tournament from ${tournament.status} to ${status}`,
      );
    }
    return this.prisma.tournament.update({ where: { id }, data: { status } });
  }

  /**
   * Register a customer: validates open registration, deadline, capacity and
   * duplicate entry, then debits the entry cost from the wallet in a
   * serializable transaction and records the registration.
   */
  async register(tournamentId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const tournament = await tx.tournament.findFirst({
          where: { id: tournamentId, deletedAt: null },
        });
        if (!tournament) throw new NotFoundException('Tournament not found');
        if (tournament.status !== 'REGISTRATION_OPEN') {
          throw new BadRequestException('Registration is not open');
        }
        if (tournament.registrationDeadline < new Date()) {
          throw new BadRequestException('Registration deadline has passed');
        }

        const existing = await tx.tournamentRegistration.findUnique({
          where: { tournamentId_userId: { tournamentId, userId } },
        });
        if (existing) throw new ConflictException('Already registered');

        const count = await tx.tournamentRegistration.count({
          where: { tournamentId },
        });
        if (count >= tournament.maxPlayers) {
          throw new ConflictException('Tournament is full');
        }

        if (tournament.entryPointsCost > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId } });
          if (!wallet) throw new NotFoundException('Wallet not found');
          if (wallet.availablePoints < BigInt(tournament.entryPointsCost)) {
            throw new BadRequestException('Insufficient points');
          }
          const updated = await tx.wallet.update({
            where: { userId },
            data: {
              availablePoints: { decrement: tournament.entryPointsCost },
              redeemedPoints: { increment: tournament.entryPointsCost },
            },
          });
          await tx.pointsTransaction.create({
            data: {
              userId,
              campaignId: tournament.campaignId,
              type: 'REDEEM',
              status: 'COMPLETED',
              points: -tournament.entryPointsCost,
              balanceAfter: updated.availablePoints,
              description: `Tournament entry: ${tournament.name}`,
            },
          });
        }

        const registration = await tx.tournamentRegistration.create({
          data: {
            tournamentId,
            userId,
            pointsSpent: tournament.entryPointsCost,
          },
        });
        return {
          registrationId: registration.id,
          status: registration.status,
          pointsSpent: tournament.entryPointsCost,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Generate the single-elimination bracket from registered + confirmed
   * players. Creates one TournamentMatch per slot for every round down to the
   * FINAL, links each match to its `nextMatch`, seeds first-round players and
   * auto-advances byes when player count is not a full power of two.
   */
  async generateBracket(tournamentId: string) {
    const tournament = await this.findById(tournamentId);

    const existing = await this.prisma.tournamentMatch.count({
      where: { tournamentId },
    });
    if (existing > 0) {
      throw new ConflictException('Bracket already generated');
    }

    const regs = await this.prisma.tournamentRegistration.findMany({
      where: {
        tournamentId,
        status: { in: ['REGISTERED', 'CONFIRMED', 'CHECKED_IN'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (regs.length < 2) {
      throw new BadRequestException('Need at least 2 players to seed a bracket');
    }

    const bracketSize = this.bracketSize(regs.length);
    const players = regs.map((r) => r.userId);

    // Rounds from first round (bracketSize) down to the final (2 slots).
    const sizes: number[] = [];
    for (let s = bracketSize; s >= 2; s = s / 2) sizes.push(s);

    return this.prisma.$transaction(async (tx) => {
      // Seed first-round pairings: standard 1-vs-last ordering with byes as
      // empty (null) slots padded onto the end of the player list.
      const seeded: (string | null)[] = [...players];
      while (seeded.length < bracketSize) seeded.push(null);

      // Create matches per round, deepest round last so we can backfill
      // nextMatchId after the parent round exists.
      const roundMatchIds: string[][] = [];
      for (let round = 0; round < sizes.length; round++) {
        const matchCount = sizes[round] / 2;
        const stage = SIZE_TO_STAGE[sizes[round]];
        const ids: string[] = [];
        for (let m = 0; m < matchCount; m++) {
          const created = await tx.tournamentMatch.create({
            data: {
              tournamentId,
              stage,
              roundIndex: round,
              matchNumber: m + 1,
            },
          });
          ids.push(created.id);
        }
        roundMatchIds.push(ids);
      }

      // Link winners forward: match m of round r feeds match floor(m/2) of r+1.
      for (let round = 0; round < roundMatchIds.length - 1; round++) {
        const cur = roundMatchIds[round];
        const next = roundMatchIds[round + 1];
        for (let m = 0; m < cur.length; m++) {
          await tx.tournamentMatch.update({
            where: { id: cur[m] },
            data: { nextMatchId: next[Math.floor(m / 2)] },
          });
        }
      }

      // Populate first-round players and resolve byes immediately.
      const firstRound = roundMatchIds[0];
      for (let m = 0; m < firstRound.length; m++) {
        const playerOneId = seeded[m * 2];
        const playerTwoId = seeded[m * 2 + 1];
        await tx.tournamentMatch.update({
          where: { id: firstRound[m] },
          data: { playerOneId, playerTwoId },
        });

        // Bye: exactly one player present → auto-advance as a WALKOVER.
        if (playerOneId && !playerTwoId) {
          await this.advanceWinnerTx(tx, firstRound[m], playerOneId, 'WALKOVER');
        } else if (!playerOneId && playerTwoId) {
          await this.advanceWinnerTx(tx, firstRound[m], playerTwoId, 'WALKOVER');
        }
      }

      return {
        tournamentId,
        bracketSize,
        rounds: sizes.length,
        matches: roundMatchIds.flat().length,
      };
    });
  }

  /**
   * Record a match result, mark it COMPLETED and advance the winner into the
   * open slot of its next match. When the FINAL completes, finalize the
   * tournament (winner/runner-up + registration statuses + COMPLETED).
   */
  async recordResult(
    tournamentId: string,
    matchId: string,
    dto: MatchResultDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({
        where: { id: matchId },
      });
      if (!match || match.tournamentId !== tournamentId) {
        throw new NotFoundException('Match not found');
      }
      if (match.status === 'COMPLETED') {
        throw new ConflictException('Match already completed');
      }
      if (
        dto.winnerId !== match.playerOneId &&
        dto.winnerId !== match.playerTwoId
      ) {
        throw new BadRequestException('Winner must be one of the match players');
      }

      await tx.tournamentMatch.update({
        where: { id: matchId },
        data: {
          winnerId: dto.winnerId,
          scoreOne: dto.scoreOne,
          scoreTwo: dto.scoreTwo,
          status: 'COMPLETED',
        },
      });

      const loserId =
        dto.winnerId === match.playerOneId
          ? match.playerTwoId
          : match.playerOneId;

      if (match.nextMatchId) {
        await this.advanceWinnerTx(tx, matchId, dto.winnerId, 'COMPLETED');
        if (loserId) {
          await tx.tournamentRegistration.updateMany({
            where: { tournamentId, userId: loserId },
            data: { status: 'ELIMINATED' },
          });
        }
      } else {
        // FINAL completed → finalize tournament.
        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            winnerId: dto.winnerId,
            runnerUpId: loserId,
            status: 'COMPLETED',
          },
        });
        await tx.tournamentRegistration.updateMany({
          where: { tournamentId, userId: dto.winnerId },
          data: { status: 'WINNER' },
        });
        if (loserId) {
          await tx.tournamentRegistration.updateMany({
            where: { tournamentId, userId: loserId },
            data: { status: 'RUNNER_UP' },
          });
        }
      }

      return { matchId, winnerId: dto.winnerId, completed: true };
    });
  }

  async getBracket(tournamentId: string) {
    await this.findById(tournamentId);
    const matches = await this.prisma.tournamentMatch.findMany({
      where: { tournamentId },
      orderBy: [{ roundIndex: 'asc' }, { matchNumber: 'asc' }],
    });
    const stages: Record<string, typeof matches> = {};
    for (const match of matches) {
      (stages[match.stage] ??= []).push(match);
    }
    return { tournamentId, stages };
  }

  /** Smallest power of two >= count, capped at the supported max of 32. */
  private bracketSize(count: number): number {
    let size = 2;
    while (size < count) size *= 2;
    return Math.min(size, 32);
  }

  /**
   * Place `winnerId` into the next match's first open slot. The earlier of the
   * two feeder matches (by matchNumber) takes playerOne; the later takes
   * playerTwo so the bracket stays positionally stable.
   */
  private async advanceWinnerTx(
    tx: Prisma.TransactionClient,
    matchId: string,
    winnerId: string,
    status: 'WALKOVER' | 'COMPLETED',
  ): Promise<void> {
    if (status === 'WALKOVER') {
      await tx.tournamentMatch.update({
        where: { id: matchId },
        data: { winnerId, status: 'WALKOVER' },
      });
    }

    const match = await tx.tournamentMatch.findUnique({
      where: { id: matchId },
    });
    if (!match?.nextMatchId) return;

    const feeders = await tx.tournamentMatch.findMany({
      where: { nextMatchId: match.nextMatchId },
      orderBy: { matchNumber: 'asc' },
      select: { id: true },
    });
    const isFirstFeeder = feeders[0]?.id === matchId;
    await tx.tournamentMatch.update({
      where: { id: match.nextMatchId },
      data: isFirstFeeder
        ? { playerOneId: winnerId }
        : { playerTwoId: winnerId },
    });
  }
}
