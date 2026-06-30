import {
  BadRequestException,
  ConflictException,
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
        'Too many redemptions in a short window. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codeHash = this.crypto.hash(dto.code.trim().toUpperCase());

    const outlet = dto.outletCode
      ? await this.prisma.outlet.findUnique({
          where: { code: dto.outletCode },
          select: { id: true },
        })
      : null;

    const result = await this.prisma.$transaction(
      async (tx) => {
        const code = await tx.loyaltyCode.findUnique({
          where: { codeHash },
          include: { campaign: true },
        });

        if (!code) throw new NotFoundException('Invalid code');
        if (code.status === 'REDEEMED') {
          throw new ConflictException('Code already redeemed');
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
          throw new ConflictException('Code already redeemed');
        }

        const redemption = await tx.codeRedemption.create({
          data: {
            codeId: code.id,
            userId,
            outletId: outlet?.id,
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

        await tx.pointsTransaction.create({
          data: {
            userId,
            campaignId: code.campaignId,
            outletId: outlet?.id,
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
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    void this.dispatchRedemptionNotifications(userId, result.pointsEarned, result.availablePoints, result.campaign);
    return result;
  }

  private async dispatchRedemptionNotifications(
    userId: string,
    pointsEarned: number,
    totalPoints: number,
    campaign: string,
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
      const body = `Hi ${name}, you just earned ${pointsEarned} pts from the ${campaign} campaign. Total: ${totalPoints} pts. Keep redeeming to climb the leaderboard!`;

      await Promise.allSettled([
        this.notifications.dispatch(userId, 'IN_APP', title, body),
        user.email
          ? this.notifications.dispatch(userId, 'EMAIL', title, body)
          : Promise.resolve(),
        user.phone
          ? this.notifications.dispatch(userId, 'SMS', title, `Amstel Rewards: You earned ${pointsEarned} pts! Total: ${totalPoints} pts. ${campaign}.`)
          : Promise.resolve(),
      ]);
    } catch {
      // swallow — redemption already succeeded
    }
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      availablePoints: Number(wallet.availablePoints),
      redeemedPoints: Number(wallet.redeemedPoints),
      lifetimePoints: Number(wallet.lifetimePoints),
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
      points: t.points,
      balance: Number(t.balanceAfter),
      createdAt: t.createdAt.toISOString(),
    }));
    return paginate(mapped, total, query);
  }
}
