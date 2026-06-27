import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationChannel, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListNotificationsDto,
  UpdatePreferencesDto,
} from './dto/notification.dto';
import { NOTIFICATION_QUEUE, NotificationJobPayload } from './notification.queue';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue<NotificationJobPayload>,
  ) {}

  /**
   * Create a QUEUED notification row, check user preferences, then:
   * - For IN_APP: mark SENT immediately (DB row is the delivery).
   * - For EMAIL/SMS/PUSH: enqueue a BullMQ job for async delivery (3 attempts,
   *   exponential backoff starting at 5 s). Returns without awaiting delivery.
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
      `[notify:${channel}] → ${userId}: ${title} (id=${notification.id})`,
    );

    // Check user preference for this channel; skip delivery if opted out.
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_channel: { userId, channel } },
    });
    if (pref && !pref.enabled) {
      this.logger.debug(
        `[notify:${channel}] skipped — user ${userId} opted out`,
      );
      return notification;
    }

    // IN_APP: the DB row is the notification — mark SENT and return.
    if (channel === 'IN_APP') {
      this.prisma.notification
        .update({ where: { id: notification.id }, data: { status: 'SENT' } })
        .catch((err: unknown) =>
          this.logger.warn(`Failed to mark IN_APP notification SENT: ${String(err)}`),
        );
      return notification;
    }

    // EMAIL / SMS / PUSH: enqueue async delivery job.
    const payload: NotificationJobPayload = {
      notificationId: notification.id,
      userId,
      channel,
      title,
      body,
    };

    await this.queue.add('deliver', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.debug(
      `[notify:${channel}] job enqueued for notification ${notification.id}`,
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
