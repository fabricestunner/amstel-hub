import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuthenticatedUser } from '../../common/decorators';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOutletRewardDto,
  ListOutletRewardRedemptionsDto,
  ListOutletRewardsDto,
  UpdateOutletRewardDto,
} from './dto/outlet-reward.dto';

@Injectable()
export class OutletRewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Public-ish catalog: ACTIVE outlet rewards, paginated. */
  async list(query: ListOutletRewardsDto) {
    const where: Prisma.OutletRewardWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.outletReward.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.outletReward.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(id: string) {
    const reward = await this.prisma.outletReward.findFirst({
      where: { id, deletedAt: null },
    });
    if (!reward) throw new NotFoundException('Outlet reward not found');
    return reward;
  }

  async create(dto: CreateOutletRewardDto) {
    return this.prisma.outletReward.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        pointsCost: dto.pointsCost,
        totalInventory: dto.totalInventory,
        remainingInventory: dto.totalInventory,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateOutletRewardDto) {
    const existing = await this.findById(id);

    // Move remainingInventory by the same delta as totalInventory changes,
    // clamped at 0 — identical policy to RewardsService.update. An explicit
    // `null` means "clear the cap" (unlimited) and must NOT be run through
    // the delta arithmetic, which only makes sense for numeric caps.
    let totalInventory: number | null | undefined;
    let remainingInventory: number | null | undefined;
    if (dto.totalInventory === null) {
      totalInventory = null;
      remainingInventory = null;
    } else if (dto.totalInventory !== undefined) {
      const consumed =
        (existing.totalInventory ?? 0) - (existing.remainingInventory ?? 0);
      totalInventory = dto.totalInventory;
      remainingInventory = Math.max(0, dto.totalInventory - Math.max(0, consumed));
    }

    return this.prisma.outletReward.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.pointsCost !== undefined ? { pointsCost: dto.pointsCost } : {}),
        ...(dto.totalInventory !== undefined
          ? { totalInventory, remainingInventory }
          : {}),
        ...(dto.validFrom !== undefined
          ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
      },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.prisma.outletReward.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /**
   * Redeem an outlet reward using the outlet's own availablePoints. Mirrors
   * RewardsService.redeem: serializable transaction validates status/window/
   * inventory/balance, then decrements availablePoints (NOT totalPoints —
   * spending never affects leaderboard rank) and inventory atomically.
   */
  async redeem(outletId: string, outletRewardId: string, requestedById: string) {
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const reward = await tx.outletReward.findFirst({
          where: { id: outletRewardId, deletedAt: null },
        });
        if (!reward) throw new NotFoundException('Outlet reward not found');
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
        if (reward.remainingInventory !== null && reward.remainingInventory <= 0) {
          throw new ConflictException('Reward is out of stock');
        }

        const outlet = await tx.outlet.findUnique({ where: { id: outletId } });
        if (!outlet) throw new NotFoundException('Outlet not found');
        if (outlet.availablePoints < BigInt(reward.pointsCost)) {
          throw new BadRequestException('Insufficient outlet points');
        }

        // Atomically claim inventory (status guard prevents oversell races).
        if (reward.remainingInventory !== null) {
          const claimed = await tx.outletReward.updateMany({
            where: { id: outletRewardId, remainingInventory: { gt: 0 } },
            data: { remainingInventory: { decrement: 1 } },
          });
          if (claimed.count === 0) {
            throw new ConflictException('Reward is out of stock');
          }
        }

        const updatedOutlet = await tx.outlet.update({
          where: { id: outletId },
          data: { availablePoints: { decrement: reward.pointsCost } },
        });

        const redemption = await tx.outletRewardRedemption.create({
          data: {
            outletRewardId,
            outletId,
            status: 'PENDING',
            pointsSpent: reward.pointsCost,
            requestedById,
          },
        });

        return {
          redemptionId: redemption.id,
          status: redemption.status,
          rewardName: reward.name,
          pointsSpent: reward.pointsCost,
          availablePoints: Number(updatedOutlet.availablePoints),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Fire-and-forget: the redemption is already committed. A notification
    // failure must never surface to the caller or roll anything back.
    void this.notifyRedeemed(outletId, result.rewardName, result.pointsSpent, result.availablePoints);

    return result;
  }

  /** Notify the outlet's manager that the outlet redeemed a reward. */
  private async notifyRedeemed(
    outletId: string,
    rewardName: string,
    pointsSpent: number,
    availablePoints: number,
  ) {
    try {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { managerId: true },
      });
      if (!outlet?.managerId) return;
      await this.notifications.notifyAllChannels(outlet.managerId, {
        title: 'Outlet reward redeemed',
        body: `Your outlet redeemed ${rewardName} for ${pointsSpent} points. ${availablePoints} points left.`,
        smsBody: `Amstel Rewards: Your outlet redeemed ${rewardName} for ${pointsSpent} pts. ${availablePoints} pts left.`,
      });
    } catch {
      // swallow — redemption already succeeded
    }
  }

  /**
   * Redemption queue. Admins see every redemption; an OUTLET_MANAGER is
   * force-scoped to their own outlet — enforced here from `user.role`/
   * `user.outletId`, not delegated to the caller. A manager with no
   * assigned outlet matches nothing (`__none__`) rather than everything.
   */
  async listRedemptions(query: ListOutletRewardRedemptionsDto, user: AuthenticatedUser) {
    const where: Prisma.OutletRewardRedemptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === 'OUTLET_MANAGER'
        ? { outletId: user.outletId ?? '__none__' }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.outletRewardRedemption.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          outletReward: { select: { name: true } },
          outlet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.outletRewardRedemption.count({ where }),
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
    approvedById: string,
  ) {
    const redemption = await this.prisma.outletRewardRedemption.findUnique({
      where: { id },
    });
    if (!redemption) throw new NotFoundException('Redemption not found');
    return this.prisma.outletRewardRedemption.update({
      where: { id },
      data: {
        status,
        approvedById,
        ...(status === 'FULFILLED' ? { fulfilledAt: new Date() } : {}),
      },
    });
  }
}
