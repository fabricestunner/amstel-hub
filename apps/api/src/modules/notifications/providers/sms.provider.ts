import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../../config/configuration';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async send(to: string, message: string): Promise<void> {
    if (!to) {
      this.logger.warn('SMS: skipping — recipient number is empty');
      return;
    }
    const sms = this.config.get<AppConfig['sms']>('sms');
    const isMock = !sms.apiKey || sms.provider === 'mock';

    if (isMock) {
      this.logger.log(`[SMS:mock] → ${to}: ${message}`);
      return;
    }

    try {
      // Placeholder: Africa's Talking integration
      // const AfricasTalking = require('africastalking');
      // const client = AfricasTalking({ apiKey: sms.apiKey, username: 'sandbox' });
      // await client.SMS.send({ to: [to], message, from: sms.senderId });
      this.logger.log(`[SMS] → ${to}: ${message} (provider=${sms.provider})`);
    } catch (err) {
      this.logger.warn(`SMS delivery failed → ${to}: ${(err as Error).message}`);
    }
  }
}
