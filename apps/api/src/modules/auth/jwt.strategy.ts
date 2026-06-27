import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  /** Runs on every authenticated request; returns the value placed on req.user. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        managedOutlet: { select: { id: true } },
        permissions: { where: { granted: true }, include: { permission: true } },
      },
    });

    if (!user || user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      id: user.id,
      role: user.role,
      regionId: user.regionId,
      outletId: user.managedOutlet?.id ?? user.registeredOutletId,
      permissions: user.permissions.map((p) => p.permission.key),
    };
  }
}
