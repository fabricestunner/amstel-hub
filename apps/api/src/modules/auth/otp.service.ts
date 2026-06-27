import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OtpPurpose } from '@prisma/client';
import { randomInt } from 'node:crypto';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Generates, dispatches and verifies one-time passwords. In production the
 * `dispatch` step hands off to the NotificationsModule (SMS/email); in dev it
 * logs the code. OTPs are stored hashed with an attempt counter + expiry.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: string, purpose: OtpPurpose): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttl = this.config.get<number>('security.otpTtl', 300);

    await this.prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: this.crypto.hash(code),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    // TODO: replace with NotificationsService.sendSms once that module lands.
    if (this.config.get('env') !== 'production') {
      this.logger.debug(`OTP for ${userId} (${purpose}): ${code}`);
    }
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
