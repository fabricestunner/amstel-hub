import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListNotificationsDto,
  UpdatePreferencesDto,
} from './dto/notification.dto';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
import { loyaltyEmailHtml } from './templates/email';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
  ) {}

  /**
   * Create a QUEUED notification row then attempt delivery via the
   * appropriate channel adapter. Delivery is best-effort — failures are
   * logged but never propagated to the caller.
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

    // Attempt delivery and update status.
    let newStatus: 'SENT' | 'FAILED' = 'SENT';
    try {
      await this.deliver(userId, channel, title, body);
    } catch {
      newStatus = 'FAILED';
    }

    // Update status in background; don't await or propagate errors.
    this.prisma.notification
      .update({ where: { id: notification.id }, data: { status: newStatus } })
      .catch((err: unknown) =>
        this.logger.warn(`Failed to update notification status: ${String(err)}`),
      );

    return notification;
  }

  private async deliver(
    userId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
  ): Promise<void> {
    switch (channel) {
      case 'IN_APP':
        // DB row is the delivery — no external call needed.
        break;

      case 'EMAIL': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (!user?.email) {
          this.logger.warn(`EMAIL notify skipped — no email for user ${userId}`);
          break;
        }
        await this.emailProvider.send(user.email, title, loyaltyEmailHtml(title, body));
        break;
      }

      case 'SMS': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true },
        });
        if (!user?.phone) {
          this.logger.warn(`SMS notify skipped — no phone for user ${userId}`);
          break;
        }
        await this.smsProvider.send(user.phone, body);
        break;
      }

      case 'PUSH': {
        const deviceToken = await this.prisma.deviceToken.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { token: true },
        });
        if (!deviceToken?.token) {
          this.logger.warn(`PUSH notify skipped — no device token for user ${userId}`);
          break;
        }
        await this.pushProvider.send(deviceToken.token, title, body);
        break;
      }
    }
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
