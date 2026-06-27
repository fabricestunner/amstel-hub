import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListNotificationsDto,
  UpdatePreferencesDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create and (eventually) deliver a notification. For now we persist a
   * QUEUED row and log in development; real channel adapters are future work.
   * Other modules can inject this service to notify users.
   *
   * TODO: resolve the user's NotificationProvider for `channel` and send,
   * then flip status to SENT/DELIVERED/FAILED based on the result.
   */
  async dispatch(
    userId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
    data?: Prisma.InputJsonValue,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, channel, title, body, data, status: 'QUEUED' },
    });
    this.logger.debug(
      `[notify:${channel}] -> ${userId}: ${title} (id=${notification.id})`,
    );
    return notification;
  }

  async list(userId: string, query: ListNotificationsDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, status: { not: 'READ' } },
      data: { status: 'READ', readAt: new Date() },
    });
    return { updated: res.count };
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { channel: 'asc' },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    await this.prisma.$transaction(
      dto.preferences.map((p) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_channel: { userId, channel: p.channel } },
          create: { userId, channel: p.channel, enabled: p.enabled },
          update: { enabled: p.enabled },
        }),
      ),
    );
    return this.getPreferences(userId);
  }
}
