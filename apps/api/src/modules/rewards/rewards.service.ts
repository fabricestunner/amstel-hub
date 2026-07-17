import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateRewardDto,
  ListRedemptionsDto,
  ListRewardsDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Public-ish catalog: ACTIVE rewards, paginated. */
  async list(query: ListRewardsDto) {
    const where: Prisma.RewardWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.reward.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(id: string) {
    const reward = await this.prisma.reward.findFirst({
      where: { id, deletedAt: null },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  async create(dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        campaignId: dto.campaignId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        type: dto.type,
        pointsCost: dto.pointsCost,
        totalInventory: dto.totalInventory,
        remainingInventory: dto.totalInventory,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateRewardDto) {
    const existing = await this.findById(id);

    // When the admin changes total stock, move remainingInventory by the same
    // delta so already-consumed units (total - remaining) stay consumed.
    // Clamp at 0 so shrinking the cap below what's been redeemed can't go
    // negative. Untouched when totalInventory isn't part of the patch.
    let remainingInventory: number | undefined;
    if (dto.totalInventory !== undefined) {
      const consumed =
        (existing.totalInventory ?? 0) - (existing.remainingInventory ?? 0);
      remainingInventory = Math.max(0, dto.totalInventory - Math.max(0, consumed));
    }

    const data: Prisma.RewardUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.pointsCost !== undefined ? { pointsCost: dto.pointsCost } : {}),
      ...(dto.perUserLimit !== undefined
        ? { perUserLimit: dto.perUserLimit }
        : {}),
      ...(dto.totalInventory !== undefined
        ? { totalInventory: dto.totalInventory, remainingInventory }
        : {}),
      ...(dto.validFrom !== undefined
        ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
        : {}),
      ...(dto.validUntil !== undefined
        ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
        : {}),
      ...(dto.campaignId !== undefined
        ? { campaign: { connect: { id: dto.campaignId } } }
        : {}),
    };
    return this.prisma.reward.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.prisma.reward.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /**
   * Redeem a reward for points. Serializable transaction validates the reward,
   * inventory, per-user limit and wallet balance, then debits the wallet,
   * decrements inventory and writes the redemption + ledger entry atomically.
   * TOURNAMENT_ENTRY rewards also create a TournamentRegistration.
   */
  async redeem(userId: string, rewardId: string, dto: RedeemRewardDto) {
    const collectionOutlet = await this.prisma.outlet.findFirst({
      where: { id: dto.collectionOutletId, deletedAt: null },
      select: { id: true },
    });
    if (!collectionOutlet) {
      throw new BadRequestException('Invalid collection outlet');
    }

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const reward = await tx.reward.findFirst({
          where: { id: rewardId, deletedAt: null },
        });
        if (!reward) throw new NotFoundException('Reward not found');
        if (reward.status !== 'ACTIVE') {
          throw new BadRequestException('Reward is not available');
        }

        const now = new Date();
        if (reward.validFrom && reward.validFrom > now) {
          throw new BadRequestException('Reward is not yet available');
        }
        if (reward.validUntil && reward.validUntil < now) {
          throw new BadRequestException('Reward validity window has ended');
        }
        if (
          reward.remainingInventory !== null &&
          reward.remainingInventory <= 0
        ) {
          throw new ConflictException('Reward is out of stock');
        }

        const priorClaims = await tx.rewardRedemption.count({
          where: {
            rewardId,
            userId,
            status: { in: ['PENDING', 'APPROVED', 'FULFILLED'] },
          },
        });
        if (priorClaims >= reward.perUserLimit) {
          throw new ConflictException('Per-user redemption limit reached');
        }

        if (reward.type === 'TOURNAMENT_ENTRY' && !dto.tournamentId) {
          throw new BadRequestException(
            'tournamentId is required for tournament-entry rewards',
          );
        }

        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new NotFoundException('Wallet not found');
        if (wallet.availablePoints < BigInt(reward.pointsCost)) {
          throw new BadRequestException('Insufficient points');
        }

        // Atomically claim inventory (status guard prevents oversell races).
        if (reward.remainingInventory !== null) {
          const claimed = await tx.reward.updateMany({
            where: { id: rewardId, remainingInventory: { gt: 0 } },
            data: { remainingInventory: { decrement: 1 } },
          });
          if (claimed.count === 0) {
            throw new ConflictException('Reward is out of stock');
          }
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            availablePoints: { decrement: reward.pointsCost },
            redeemedPoints: { increment: reward.pointsCost },
          },
        });

        const redemption = await tx.rewardRedemption.create({
          data: {
            rewardId,
            userId,
            status: 'PENDING',
            pointsSpent: reward.pointsCost,
            collectionOutletId: dto.collectionOutletId,
          },
        });

        if (reward.type === 'TOURNAMENT_ENTRY' && dto.tournamentId) {
          await tx.tournamentRegistration.create({
            data: {
              tournamentId: dto.tournamentId,
              userId,
              pointsSpent: reward.pointsCost,
            },
          });
        }

        await tx.pointsTransaction.create({
          data: {
            userId,
            campaignId: reward.campaignId,
            outletId: dto.collectionOutletId,
            type: 'REDEEM',
            status: 'COMPLETED',
            points: -reward.pointsCost,
            balanceAfter: updatedWallet.availablePoints,
            description: `Redeemed reward: ${reward.name}`,
            rewardRedemptionId: redemption.id,
          },
        });

        return {
          redemptionId: redemption.id,
          status: redemption.status,
          pointsSpent: reward.pointsCost,
          availablePoints: Number(updatedWallet.availablePoints),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Fire-and-forget: the redemption is already committed. A notification
    // failure must never surface to the caller or roll anything back.
    void this.notifyRedeemed({
      userId,
      rewardId,
      pointsSpent: result.pointsSpent,
      availablePoints: result.availablePoints,
      collectionOutletId: dto.collectionOutletId,
      tournamentId: dto.tournamentId,
    });

    return result;
  }

  /** Notify a customer that they redeemed a reward (or entered a tournament). */
  private async notifyRedeemed(params: {
    userId: string;
    rewardId: string;
    pointsSpent: number;
    availablePoints: number;
    collectionOutletId: string;
    tournamentId?: string;
  }) {
    try {
      const [reward, outlet, tournament] = await Promise.all([
        this.prisma.reward.findUnique({
          where: { id: params.rewardId },
          select: { name: true, type: true },
        }),
        this.prisma.outlet.findUnique({
          where: { id: params.collectionOutletId },
          select: { name: true },
        }),
        params.tournamentId
          ? this.prisma.tournament.findUnique({
              where: { id: params.tournamentId },
              select: { name: true },
            })
          : Promise.resolve(null),
      ]);
      if (!reward) return;

      if (reward.type === 'TOURNAMENT_ENTRY') {
        const tName = tournament?.name ?? 'the tournament';
        await this.notifications.notifyAllChannels(params.userId, {
          title: "You're registered!",
          body: `You're registered for ${tName}. ${params.pointsSpent} points spent — you have ${params.availablePoints} points left. Good luck!`,
          smsBody: `Amstel Rewards: You're in ${tName}! ${params.pointsSpent} pts spent, ${params.availablePoints} left. Good luck!`,
        });
        return;
      }

      const where = outlet?.name ? ` Collect it at ${outlet.name}.` : '';
      await this.notifications.notifyAllChannels(params.userId, {
        title: 'Reward redeemed',
        body: `You redeemed ${reward.name} for ${params.pointsSpent} points. You have ${params.availablePoints} points left.${where}`,
        smsBody: `Amstel Rewards: You redeemed ${reward.name} for ${params.pointsSpent} pts. ${params.availablePoints} pts left.${where}`,
      });
    } catch {
      // swallow — redemption already succeeded
    }
  }

  /** Notify a customer that their redemption is ready to collect / handed over. */
  private async notifyRedemptionStatus(
    redemption: {
      userId: string;
      rewardId: string;
      collectionOutletId: string | null;
    },
    status: 'APPROVED' | 'FULFILLED',
  ) {
    try {
      const [reward, outlet] = await Promise.all([
        this.prisma.reward.findUnique({
          where: { id: redemption.rewardId },
          select: { name: true },
        }),
        redemption.collectionOutletId
          ? this.prisma.outlet.findUnique({
              where: { id: redemption.collectionOutletId },
              select: { name: true },
            })
          : Promise.resolve(null),
      ]);
      const rewardName = reward?.name ?? 'your reward';

      if (status === 'APPROVED') {
        const where = outlet?.name ? ` at ${outlet.name}` : '';
        await this.notifications.notifyAllChannels(redemption.userId, {
          title: 'Reward ready to collect',
          body: `Good news! Your ${rewardName} is approved and ready to collect${where}.`,
          smsBody: `Amstel Rewards: Your ${rewardName} is ready to collect${where}.`,
        });
      } else {
        await this.notifications.notifyAllChannels(redemption.userId, {
          title: 'Reward collected',
          body: `Your ${rewardName} has been handed over. Enjoy!`,
          smsBody: `Amstel Rewards: Your ${rewardName} has been handed over. Enjoy!`,
        });
      }
    } catch {
      // swallow — the status change already succeeded
    }
  }

  /** The current customer's own claimed rewards, paginated. */
  async listMyRedemptions(userId: string, query: ListRedemptionsDto) {
    const where: Prisma.RewardRedemptionWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        select: {
          id: true,
          status: true,
          pointsSpent: true,
          fulfillmentRef: true,
          createdAt: true,
          reward: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  /**
   * Fulfillment/approval queue. Admins see every redemption; an
   * OUTLET_MANAGER is force-scoped to redemptions collected at their outlet.
   */
  async listRedemptions(query: ListRedemptionsDto, user: AuthenticatedUser) {
    const where: Prisma.RewardRedemptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === 'OUTLET_MANAGER'
        ? { collectionOutletId: user.outletId ?? '__none__' }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          reward: { select: { name: true, type: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          collectionOutlet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  approve(id: string, approverId: string) {
    return this.setRedemptionStatus(id, 'APPROVED', approverId);
  }

  reject(id: string, approverId: string) {
    return this.setRedemptionStatus(id, 'REJECTED', approverId);
  }

  /**
   * Admins can fulfill any redemption. An OUTLET_MANAGER may only fulfill
   * redemptions collected at their own outlet; they can move a redemption
   * straight from PENDING to FULFILLED when the customer picks it up.
   */
  async fulfill(id: string, user: AuthenticatedUser) {
    if (user.role === 'OUTLET_MANAGER') {
      const redemption = await this.prisma.rewardRedemption.findUnique({
        where: { id },
        select: { collectionOutletId: true, status: true },
      });
      if (!redemption) throw new NotFoundException('Redemption not found');
      if (
        !user.outletId ||
        redemption.collectionOutletId !== user.outletId
      ) {
        throw new ForbiddenException(
          'Redemption is not assigned to your outlet',
        );
      }
      if (redemption.status !== 'PENDING' && redemption.status !== 'APPROVED') {
        throw new BadRequestException(
          'Only pending or approved redemptions can be fulfilled',
        );
      }
    }
    return this.setRedemptionStatus(id, 'FULFILLED', user.id);
  }

  private async setRedemptionStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'FULFILLED',
    approverId: string,
  ) {
    const redemption = await this.prisma.rewardRedemption.findUnique({
      where: { id },
    });
    if (!redemption) throw new NotFoundException('Redemption not found');
    const updated = await this.prisma.rewardRedemption.update({
      where: { id },
      data: {
        status,
        approvedById: approverId,
        ...(status === 'FULFILLED' ? { fulfilledAt: new Date() } : {}),
      },
    });

    // Tell the customer their reward is ready / handed over. REJECTED stays
    // silent (no auto-refund, nothing actionable to announce). Fire-and-forget.
    if (status === 'APPROVED' || status === 'FULFILLED') {
      void this.notifyRedemptionStatus(redemption, status);
    }

    return updated;
  }
}
