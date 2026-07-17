import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RewardCategoriesService } from './reward-categories.service';

describe('RewardCategoriesService.slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(RewardCategoriesService.slugify('Free Drink')).toBe('free-drink');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(RewardCategoriesService.slugify('  Gift  &  Item!! ')).toBe('gift-item');
  });
});

describe('RewardCategoriesService', () => {
  function build(overrides: {
    category?: unknown;
    rewardCount?: number;
  } = {}) {
    const create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'cat-1', ...data }),
    );
    const update = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));
    const prisma = {
      rewardCategory: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(overrides.category ?? null),
        create,
        update,
      },
      reward: {
        count: jest.fn().mockResolvedValue(overrides.rewardCount ?? 0),
      },
    } as unknown as PrismaService;
    return { service: new RewardCategoriesService(prisma), prisma, create, update };
  }

  it('creates a STANDARD, non-system category with a derived slug', async () => {
    const { service, create } = build();

    await service.create({ name: 'Free Drink' });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Free Drink',
        slug: 'free-drink',
        behavior: 'STANDARD',
        isSystem: false,
      }),
    });
  });

  it('refuses to delete a system category', async () => {
    const { service } = build({ category: { id: 'cat-1', isSystem: true } });

    await expect(service.remove('cat-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses to delete a category still used by rewards', async () => {
    const { service } = build({
      category: { id: 'cat-1', isSystem: false },
      rewardCount: 3,
    });

    await expect(service.remove('cat-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('soft-deletes an unused, non-system category', async () => {
    const { service, update } = build({
      category: { id: 'cat-1', isSystem: false },
      rewardCount: 0,
    });

    await service.remove('cat-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('404s when updating a missing category', async () => {
    const { service } = build({ category: null });

    await expect(
      service.update('missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
