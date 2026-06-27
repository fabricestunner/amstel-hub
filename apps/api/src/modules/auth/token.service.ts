import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';

import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Issues access tokens and persists hashed, rotation-tracked refresh tokens.
 * Reuse of a revoked token in a family revokes the whole family (theft response).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async issuePair(
    user: Pick<User, 'id' | 'role'>,
    ctx: { userAgent?: string; ipAddress?: string; family?: string } = {},
  ): Promise<TokenPair> {
    const accessTtl = this.config.get<number>('jwt.accessTtl')!;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: accessTtl },
    );

    const rawRefresh = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.crypto.hash(rawRefresh),
        family: ctx.family ?? randomUUID(),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken: rawRefresh, expiresIn: accessTtl };
  }

  /** Validates + rotates a refresh token. Throws on reuse/expiry/revocation. */
  async rotate(
    rawRefresh: string,
    ctx: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const tokenHash = this.crypto.hash(rawRefresh);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || existing.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    if (existing.revokedAt) {
      // Reuse detected → nuke the family.
      await this.prisma.refreshToken.updateMany({
        where: { family: existing.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('Refresh token reuse detected');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issuePair(existing.user, { ...ctx, family: existing.family });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
