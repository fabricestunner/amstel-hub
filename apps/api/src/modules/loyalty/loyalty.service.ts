import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CryptoService } from '../../common/crypto/crypto.service';
import {
  PaginatedResult,
  PaginationQueryDto,
  paginate,
} from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedeemCodeDto } from './dto/loyalty.dto';

interface RedeemContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly fraud: FraudService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Redeem a loyalty code for points. Runs in a serializable transaction so a
   * code can never be redeemed twice (enforced both by the unique constraint on
   * CodeRedemption.codeId and the conditional status update).
   */
  async redeemCode(userId: string, dto: RedeemCodeDto, ctx: RedeemContext) {
    // Anti-fraud: block abusive redemption velocity (also raises a FraudFlag).
    if (await this.fraud.checkRedemptionVelocity(userId, ctx.ipAddress)) {
      throw new HttpException(
        'Too many scans in a short window. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codeHash = this.crypto.hash(dto.code.trim().toUpperCase());

    const outlet = dto.outletCode
      ? await this.prisma.outlet.findUnique({
          where: { code: dto.outletCode },
          select: { id: true, name: true },
        })
      : null;

    // Promoters may redeem codes like a customer, but never a voucher tied to
    // the outlet they are assigned to (anti self-dealing).
    const redeemer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, assignedOutletId: true },
    });

    const result = await this.runRedeemTransaction(async (tx) => {
        const code = await tx.loyaltyCode.findUnique({
          where: { codeHash },
          include: { campaign: true },
        });

        // Attribute the redemption to the outlet the customer scanned at, or —
        // when none is supplied — fall back to the outlet the voucher itself was
        // generated for. Without this, outlet-linked vouchers redeemed from the
        // customer app record no outlet and never surface in outlet reporting.
        const attributedOutletId = outlet?.id ?? code?.outletId ?? undefined;

        if (
          redeemer?.role === 'PROMOTER' &&
          attributedOutletId &&
          redeemer.assignedOutletId === attributedOutletId
        ) {
          throw new ForbiddenException(
            'Promoters cannot scan vouchers at their own outlet',
          );
        }

        if (!code) throw new NotFoundException('Invalid code');
        if (code.status === 'REDEEMED') {
          throw new ConflictException('Code already scanned');
        }
        if (code.status !== 'ACTIVE') {
          throw new BadRequestException(`Code is ${code.status.toLowerCase()}`);
        }
        if (code.expiresAt && code.expiresAt < new Date()) {
          throw new BadRequestException('Code has expired');
        }
        if (code.campaign.status !== 'ACTIVE') {
          throw new BadRequestException('Campaign is not active');
        }

        // Atomically claim the code (status guard prevents races).
        const claimed = await tx.loyaltyCode.updateMany({
          where: { id: code.id, status: 'ACTIVE' },
          data: { status: 'REDEEMED' },
        });
        if (claimed.count === 0) {
          throw new ConflictException('Code already scanned');
        }

        const redemption = await tx.codeRedemption.create({
          data: {
            codeId: code.id,
            userId,
            outletId: attributedOutletId,
            points: code.pointsValue,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            deviceId: dto.deviceId,
            geoLat: dto.geoLat,
            geoLng: dto.geoLng,
          },
        });

        const wallet = await tx.wallet.update({
          where: { userId },
          data: {
            availablePoints: { increment: code.pointsValue },
            lifetimePoints: { increment: code.pointsValue },
          },
        });

        // Credit the outlet the code was attributed to. totalPoints never
        // decreases (drives national/regional leaderboard rank);
        // availablePoints is the outlet's spendable balance for outlet
        // rewards and decrements only on outlet-reward redemption.
        if (attributedOutletId) {
          await tx.outlet.update({
            where: { id: attributedOutletId },
            data: {
              totalPoints: { increment: code.pointsValue },
              availablePoints: { increment: code.pointsValue },
            },
          });
        }

        await tx.pointsTransaction.create({
          data: {
            userId,
            campaignId: code.campaignId,
            outletId: attributedOutletId,
            type: 'EARN',
            status: 'COMPLETED',
            points: code.pointsValue,
            balanceAfter: wallet.availablePoints,
            description: `Earned from ${code.type} code`,
            codeRedemptionId: redemption.id,
          },
        });

        return {
          pointsEarned: code.pointsValue,
          availablePoints: Number(wallet.availablePoints),
          campaign: code.campaign.name,
          outlet: outlet?.name,
        };
      });

    void this.dispatchRedemptionNotifications(userId, result.pointsEarned, result.availablePoints, result.campaign, result.outlet);
    return result;
  }

  /**
   * Runs `fn` inside the redemption's serializable transaction, retrying on
   * Postgres serialization failures (Prisma P2034) with a short jittered
   * backoff. This transaction now writes `outlets(id)`, which makes a busy
   * outlet a hot row: two customers scanning within milliseconds at the same
   * outlet can conflict, and Postgres aborts one side with P2034 — the
   * transaction rolls back cleanly (the code stays ACTIVE, rescannable), so
   * retrying is safe.
   *
   * Only P2034 is retried. Every other error — including the deliberate
   * ConflictException for an already-redeemed code and the fraud 429 (which
   * is thrown before this method is even called) — propagates immediately
   * and unchanged. After the final attempt, a persistent P2034 is converted
   * to a ConflictException rather than surfacing as a raw 500.
   */
  private async runRedeemTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (err) {
        const isSerializationFailure =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
        if (!isSerializationFailure) throw err;
        if (attempt === MAX_ATTEMPTS) {
          throw new ConflictException(
            'That scan collided with another at this outlet. Please try again.',
          );
        }
        const backoffMs = 25 + Math.random() * 25;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    // Unreachable — the loop above always returns or throws.
    throw new ConflictException(
      'That scan collided with another at this outlet. Please try again.',
    );
  }

  private async dispatchRedemptionNotifications(
    userId: string,
    pointsEarned: number,
    totalPoints: number,
    campaign: string,
    outlet?: string,
  ) {
    // Fire-and-forget: never let a notification failure surface as an
    // unhandled rejection or affect the redemption response.
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, firstName: true },
      });
      if (!user) return;

      const name = user.firstName ?? 'Customer';
      const title = `You earned ${pointsEarned} points!`;
      const outletText = outlet ? ` at ${outlet}` : '';
      const body = `Hi ${name}, you have earned ${pointsEarned} points from the ${campaign} Campaign${outletText}. Total Points: ${totalPoints}. Keep scanning to climb the leaderboard! Thank you.`;

      await Promise.allSettled([
        this.notifications.dispatch(userId, 'IN_APP', title, body),
        user.email
          ? this.notifications.dispatch(userId, 'EMAIL', title, body)
          : Promise.resolve(),
        user.phone
          ? this.notifications.dispatch(userId, 'SMS', title, `Amstel Rewards: You earned ${pointsEarned} points from ${campaign}${outletText}. Total Points: ${totalPoints}. Keep scanning!`)
          : Promise.resolve(),
      ]);
    } catch {
      // swallow — redemption already succeeded
    }
  }

  async getWallet(userId: string) {
    const [wallet, codeAgg] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.codeRedemption.aggregate({
        where: { userId },
        _count: { _all: true },
        _sum: { points: true },
      }),
    ]);
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      availablePoints: Number(wallet.availablePoints),
      redeemedPoints: Number(wallet.redeemedPoints),
      lifetimePoints: Number(wallet.lifetimePoints),
      codesRedeemed: codeAgg._count._all,
      pointsFromCodes: codeAgg._sum.points ?? 0,
    };
  }

  async getTransactions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.pointsTransaction.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          campaign: { select: { name: true } },
          outlet: { select: { name: true } },
        },
      }),
      this.prisma.pointsTransaction.count({ where }),
    ]);
    const mapped = items.map((t) => ({
      id: t.id,
      type: t.type.toLowerCase(),
      description: t.description ?? t.campaign?.name ?? t.outlet?.name,
      campaign: t.campaign?.name ?? null,
      outlet: t.outlet?.name ?? null,
      points: t.points,
      balance: Number(t.balanceAfter),
      createdAt: t.createdAt.toISOString(),
    }));
    return paginate(mapped, total, query);
  }
}
