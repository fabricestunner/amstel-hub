import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListUsersQueryDto,
  UpdateProfileDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/user.dto';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerified: true,
  phoneVerified: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: PUBLIC_USER_FIELDS,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async list(query: ListUsersQueryDto) {
    const where = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                firstName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              { phone: { contains: query.search } },
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_USER_FIELDS,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_FIELDS,
    });
  }

  async updateStatus(targetId: string, dto: UpdateUserStatusDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot change the status of a SUPER_ADMIN');
    }
    return this.prisma.user.update({
      where: { id: targetId },
      data: { status: dto.status },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async updateRole(actorId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async getWallet(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        wallet: {
          select: {
            availablePoints: true,
            redeemedPoints: true,
            lifetimePoints: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.wallet) {
      return { availablePoints: 0, redeemedPoints: 0, lifetimePoints: 0 };
    }
    return {
      availablePoints: Number(user.wallet.availablePoints),
      redeemedPoints: Number(user.wallet.redeemedPoints),
      lifetimePoints: Number(user.wallet.lifetimePoints),
    };
  }
}
