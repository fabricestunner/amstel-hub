import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
  isEmail,
  normalizeIdentifier,
  normalizePhone,
} from '../../common/utils/phone.util';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
  ) {}

  /**
   * Self-service customer registration. Accepts a phone number OR email as the
   * primary contact, creates a wallet, and sends a verification code over the
   * matching channel (SMS for phone, email for email).
   */
  async register(dto: RegisterDto) {
    const phone = normalizePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase();
    if (!phone && !email) {
      throw new BadRequestException(
        'Provide a phone number or email to sign up',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });
    if (existing) throw new ConflictException('Phone or email already registered');

    let registeredOutletId: string | undefined;
    if (dto.outletCode) {
      const outlet = await this.prisma.outlet.findUnique({
        where: { code: dto.outletCode },
        select: { id: true },
      });
      registeredOutletId = outlet?.id;
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        email,
        passwordHash: await argon2.hash(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        yearOfBirth: dto.yearOfBirth,
        role: 'CUSTOMER',
        status: 'PENDING',
        registeredOutletId,
        wallet: { create: {} },
      },
    });

    // Phone signups verify via SMS; email-only signups verify via email.
    const channel = phone ? 'SMS' : 'EMAIL';
    const purpose = phone ? 'PHONE_VERIFICATION' : 'EMAIL_VERIFICATION';
    await this.otp.issue(user.id, purpose, channel);

    return {
      id: user.id,
      identifier: phone ?? email,
      channel,
      message: `Verification code sent via ${channel === 'SMS' ? 'SMS' : 'email'}`,
    };
  }

  /** Verify a registration OTP delivered to a phone (SMS) or email. */
  async verifyOtp(dto: VerifyOtpDto, ctx: RequestContext) {
    const usingEmail = isEmail(dto.identifier);
    const identifier = normalizeIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: usingEmail ? { email: identifier } : { phone: identifier },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const purpose = usingEmail ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION';
    await this.otp.verify(user.id, purpose, dto.code);

    await this.prisma.user.update({
      where: { id: user.id },
      data: usingEmail
        ? { emailVerified: true, status: 'ACTIVE' }
        : { phoneVerified: true, status: 'ACTIVE' },
    });

    return this.tokens.issuePair(user, ctx);
  }

  async login(dto: LoginDto, ctx: RequestContext) {
    const identifier = normalizeIdentifier(dto.identifier);
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ phone: identifier }, { email: identifier }],
      },
    });

    const valid =
      user?.passwordHash && (await argon2.verify(user.passwordHash, dto.password));

    // Always record the attempt for fraud/audit purposes.
    await this.prisma.loginAudit.create({
      data: {
        userId: user?.id,
        success: !!valid,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        reason: valid ? undefined : 'invalid_credentials',
      },
    });

    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.tokens.issuePair(user, ctx);
  }

  async refresh(refreshToken: string, ctx: RequestContext) {
    try {
      return await this.tokens.rotate(refreshToken, ctx);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.tokens.revokeAll(userId);
    return { message: 'Logged out' };
  }

  async forgotPassword(rawIdentifier: string) {
    const usingEmail = isEmail(rawIdentifier);
    const identifier = normalizeIdentifier(rawIdentifier);
    const user = await this.prisma.user.findFirst({
      where: usingEmail ? { email: identifier } : { phone: identifier },
    });
    // Always succeed to avoid user enumeration.
    if (user) {
      await this.otp.issue(
        user.id,
        'PASSWORD_RESET',
        usingEmail ? 'EMAIL' : 'SMS',
      );
    }
    return { message: 'If the account exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const usingEmail = isEmail(dto.identifier);
    const identifier = normalizeIdentifier(dto.identifier);
    const user = await this.prisma.user.findFirst({
      where: usingEmail ? { email: identifier } : { phone: identifier },
    });
    if (!user) throw new UnauthorizedException('User not found');

    await this.otp.verify(user.id, 'PASSWORD_RESET', dto.code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });
    await this.tokens.revokeAll(user.id);
    return { message: 'Password updated' };
  }
}
