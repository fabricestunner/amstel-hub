import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateRewardCategoryDto,
  UpdateRewardCategoryDto,
} from './dto/reward-category.dto';

@Injectable()
export class RewardCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** URL/enum-safe slug: lowercase, non-alphanumerics collapsed to single
   *  hyphens, no leading/trailing hyphens. */
  static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  list() {
    return this.prisma.rewardCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateRewardCategoryDto) {
    const name = dto.name.trim();
    const slug = RewardCategoriesService.slugify(name);
    if (!slug) {
      throw new BadRequestException(
        'Category name must contain letters or numbers',
      );
    }
    try {
      // Admin-created categories are always STANDARD; only the seeded system
      // category may carry TOURNAMENT_ENTRY behaviour.
      return await this.prisma.rewardCategory.create({
        data: {
          name,
          slug,
          behavior: 'STANDARD',
          isSystem: false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async update(id: string, dto: UpdateRewardCategoryDto) {
    const existing = await this.prisma.rewardCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Category not found');

    const data: Prisma.RewardCategoryUpdateInput = {
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const slug = RewardCategoriesService.slugify(name);
      if (!slug) {
        throw new BadRequestException(
          'Category name must contain letters or numbers',
        );
      }
      data.name = name;
      data.slug = slug;
    }

    try {
      return await this.prisma.rewardCategory.update({ where: { id }, data });
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.rewardCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, isSystem: true },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing.isSystem) {
      throw new ConflictException('System categories cannot be deleted');
    }

    const inUse = await this.prisma.reward.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new ConflictException(
        'Category is still used by rewards; reassign them first',
      );
    }

    await this.prisma.rewardCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  private mapWriteError(err: unknown): Error {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException('A category with this name already exists');
    }
    return err instanceof Error ? err : new Error('Unknown error');
  }
}
