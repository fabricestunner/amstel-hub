import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

import { AppConfig } from '../../../config/configuration';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const smtp = this.config.get<AppConfig['smtp']>('smtp');
    const isLocalOrEmpty = !smtp.host || smtp.host === 'localhost';

    if (isLocalOrEmpty) {
      // In dev/test mode: use Mailpit (or similar local SMTP relay) without auth.
      this.transporter = nodemailer.createTransport({
        host: smtp.host || 'localhost',
        port: smtp.port,
        secure: false,
        // No auth for local relay (Mailpit)
        ignoreTLS: true,
      });
      this.logger.log(`Email: local relay mode → ${smtp.host}:${smtp.port}`);
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user
          ? { user: smtp.user, pass: smtp.password }
          : undefined,
      });
      this.logger.log(`Email: SMTP mode → ${smtp.host}:${smtp.port}`);
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!to) {
      this.logger.warn('Email: skipping — recipient address is empty');
      return;
    }
    try {
      const smtp = this.config.get<AppConfig['smtp']>('smtp');
      await this.transporter!.sendMail({
        from: smtp.from,
        to,
        subject,
        html,
      });
      this.logger.debug(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      this.logger.warn(`Email delivery failed → ${to}: ${(err as Error).message}`);
    }
  }
}
