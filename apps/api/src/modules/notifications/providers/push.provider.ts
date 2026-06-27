import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../../config/configuration';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async send(deviceToken: string, title: string, body: string): Promise<void> {
    if (!deviceToken) {
      this.logger.warn('Push: skipping — device token is empty');
      return;
    }
    const fcm = this.config.get<AppConfig['fcm']>('fcm');
    const isMock = !fcm.projectId;

    if (isMock) {
      this.logger.log(`[Push:mock] → ${deviceToken}: ${title} — ${body}`);
      return;
    }

    try {
      // Placeholder: firebase-admin integration
      // const admin = require('firebase-admin');
      // await admin.messaging().send({
      //   token: deviceToken,
      //   notification: { title, body },
      // });
      this.logger.log(`[Push] → ${deviceToken}: ${title}`);
    } catch (err) {
      this.logger.warn(`Push delivery failed → ${deviceToken}: ${(err as Error).message}`);
    }
  }
}
