import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../../common/prisma/prisma.service';
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

  /** Self-service customer registration. Creates wallet + sends phone OTP. */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
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
        phone: dto.phone,
        email: dto.email,
        passwordHash: await argon2.hash(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CUSTOMER',
        status: 'PENDING',
        registeredOutletId,
        wallet: { create: {} },
      },
    });

    await this.otp.issue(user.id, 'PHONE_VERIFICATION');
    return { id: user.id, phone: user.phone, message: 'OTP sent for verification' };
  }

  async verifyPhone(dto: VerifyOtpDto, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.otp.verify(user.id, 'PHONE_VERIFICATION', dto.code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, status: 'ACTIVE' },
    });

    return this.tokens.issuePair(user, ctx);
  }

  async login(dto: LoginDto, ctx: RequestContext) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
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

  async forgotPassword(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier }] },
    });
    // Always succeed to avoid user enumeration.
    if (user) await this.otp.issue(user.id, 'PASSWORD_RESET');
    return { message: 'If the account exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
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
