import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateRewardDto,
  ListRedemptionsDto,
  ListRewardsDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.findById(id);
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
        ? { totalInventory: dto.totalInventory }
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
    return this.prisma.$transaction(
      async (tx) => {
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
  }

  async listRedemptions(query: ListRedemptionsDto) {
    const where: Prisma.RewardRedemptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
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

  fulfill(id: string, approverId: string) {
    return this.setRedemptionStatus(id, 'FULFILLED', approverId);
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
    return this.prisma.rewardRedemption.update({
      where: { id },
      data: {
        status,
        approvedById: approverId,
        ...(status === 'FULFILLED' ? { fulfilledAt: new Date() } : {}),
      },
    });
  }
}
