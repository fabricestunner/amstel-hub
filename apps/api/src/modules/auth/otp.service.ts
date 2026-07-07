import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OtpPurpose } from '@prisma/client';
import { randomInt } from 'node:crypto';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailProvider } from '../notifications/providers/email.provider';
import { SmsProvider } from '../notifications/providers/sms.provider';

export type OtpChannel = 'SMS' | 'EMAIL';

/**
 * Generates, dispatches and verifies one-time passwords. Codes are delivered
 * transactionally (bypassing the notification queue / marketing preferences)
 * via SMS or email, and stored hashed with an attempt counter + expiry.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
  ) {}

  async issue(
    userId: string,
    purpose: OtpPurpose,
    channel?: OtpChannel,
  ): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttl = this.config.get<number>('security.otpTtl', 300);
    const minutes = Math.max(1, Math.floor(ttl / 60));

    await this.prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: this.crypto.hash(code),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    await this.dispatch(userId, purpose, code, minutes, channel);

    if (this.config.get('env') !== 'production') {
      this.logger.debug(`OTP for ${userId} (${purpose}): ${code}`);
    }
  }

  /** Deliver the code over SMS or email, choosing the channel from the purpose. */
  private async dispatch(
    userId: string,
    purpose: OtpPurpose,
    code: string,
    minutes: number,
    channel?: OtpChannel,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });
    if (!user) return;

    const useEmail =
      channel === 'EMAIL' || (!channel && purpose === 'EMAIL_VERIFICATION');

    const smsText = `Your Amstel Rewards code is ${code}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}. Do not share it.`;

    try {
      if (useEmail && user.email) {
        await this.email.send(
          user.email,
          'Your Amstel Rewards verification code',
          this.otpEmailHtml(code, minutes),
        );
      } else if (user.phone) {
        await this.sms.send(user.phone, smsText);
      } else {
        this.logger.warn(`OTP dispatch skipped — no destination for user ${userId}`);
      }
    } catch (err) {
      this.logger.warn(
        `OTP dispatch failed for user ${userId}: ${(err as Error).message}`,
      );
    }
  }

  private otpEmailHtml(code: string, minutes: number): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#b1060f;margin-bottom:8px">Amstel Rewards</h2>
        <p>Use the verification code below to continue:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
        <p style="color:#666">This code expires in ${minutes} minute${minutes === 1 ? '' : 's'}. If you didn't request it, you can ignore this email.</p>
      </div>
    `;
  }

  async verify(
    userId: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found');
    }

    const maxAttempts = this.config.get<number>('security.otpMaxAttempts', 5);
    if (otp.attempts >= maxAttempts) {
      throw new BadRequestException('Too many attempts; request a new code');
    }

    if (this.crypto.hash(code) !== otp.codeHash) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }
}
