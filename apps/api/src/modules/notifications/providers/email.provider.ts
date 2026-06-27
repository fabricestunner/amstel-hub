import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { AppConfig } from '../../../config/configuration';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private resend: Resend | null = null;
  private localTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const resendKey = this.config.get('resend', { infer: true }).apiKey;
    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.logger.log('Email: Resend mode');
    } else {
      const smtp = this.config.get('smtp', { infer: true });
      this.localTransporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: false,
        ignoreTLS: true,
      });
      this.logger.log(`Email: local relay mode → ${smtp.host}:${smtp.port}`);
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!to) {
      this.logger.warn('Email: skipping — recipient address is empty');
      return;
    }
    try {
      if (this.resend) {
        const from = this.config.get('resend', { infer: true }).from;
        const { error } = await this.resend.emails.send({ from, to, subject, html });
        if (error) throw new Error(error.message);
      } else {
        const from = this.config.get('smtp', { infer: true }).from;
        await this.localTransporter!.sendMail({ from, to, subject, html });
      }
      this.logger.debug(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      this.logger.warn(`Email delivery failed → ${to}: ${(err as Error).message}`);
    }
  }
}
