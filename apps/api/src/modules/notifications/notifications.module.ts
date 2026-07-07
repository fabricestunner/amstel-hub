import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { AppConfig } from '../../config/configuration';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './notification.processor';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
import { NOTIFICATION_QUEUE } from './notification.queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        connection: { url: config.get('redis', { infer: true }).url },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProcessor,
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [NotificationsService, SmsProvider, EmailProvider],
})
export class NotificationsModule {}
