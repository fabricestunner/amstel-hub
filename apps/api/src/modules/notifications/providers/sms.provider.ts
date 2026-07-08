import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../../config/configuration';

const MISTA_URL = 'https://api.mista.io/sms';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async send(to: string, message: string): Promise<void> {
    if (!to) {
      this.logger.warn('SMS: skipping — recipient number is empty');
      return;
    }
    const sms = this.config.get('sms', { infer: true });
    if (!sms.apiKey || sms.provider === 'mock') {
      this.logger.log(`[SMS:mock] → ${to}: ${message}`);
      return;
    }

    // Bound the outbound call so a slow/hung provider never ties up the worker.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(MISTA_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sms.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ to, message, from: sms.senderId }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Mista HTTP ${res.status}`);
      }
      const body = (await res.json()) as { status: string; message?: string };
      if (body.status === 'error') throw new Error(body.message ?? 'Mista error');
      this.logger.debug(`SMS sent via Mista → ${to}`);
    } catch (err) {
      const reason =
        (err as Error).name === 'AbortError'
          ? 'timed out after 10s'
          : (err as Error).message;
      this.logger.warn(`SMS delivery failed → ${to}: ${reason}`);
      // Re-throw so the BullMQ worker records FAILED and retries with backoff
      // instead of silently marking the message delivered.
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
