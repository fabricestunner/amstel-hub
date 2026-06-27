import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';
import { loyaltyEmailHtml } from './templates/email';
import { NOTIFICATION_QUEUE, NotificationJobPayload } from './notification.queue';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const { notificationId, userId, channel, title, body } = job.data;
    this.logger.debug(
      `[queue:${channel}] processing job ${job.id} for notification ${notificationId}`,
    );

    try {
      await this.deliver(userId, channel, title, body);

      await this.prisma.notification
        .update({ where: { id: notificationId }, data: { status: 'SENT' } })
        .catch((err: unknown) =>
          this.logger.warn(`Failed to mark notification SENT: ${String(err)}`),
        );
    } catch (err) {
      this.logger.warn(
        `[queue:${channel}] delivery failed for ${notificationId}: ${(err as Error).message}`,
      );

      await this.prisma.notification
        .update({ where: { id: notificationId }, data: { status: 'FAILED' } })
        .catch((updateErr: unknown) =>
          this.logger.warn(`Failed to mark notification FAILED: ${String(updateErr)}`),
        );

      // Re-throw so BullMQ can apply retry / backoff logic.
      throw err;
    }
  }

  private async deliver(
    userId: string,
    channel: NotificationJobPayload['channel'],
    title: string,
    body: string,
  ): Promise<void> {
    switch (channel) {
      case 'IN_APP':
        // In-app notifications are DB rows — no external delivery needed.
        break;

      case 'EMAIL': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (!user?.email) {
          this.logger.warn(`EMAIL job skipped — no email for user ${userId}`);
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
          this.logger.warn(`SMS job skipped — no phone for user ${userId}`);
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
          this.logger.warn(`PUSH job skipped — no device token for user ${userId}`);
          break;
        }
        await this.pushProvider.send(deviceToken.token, title, body);
        break;
      }
    }
  }
}
