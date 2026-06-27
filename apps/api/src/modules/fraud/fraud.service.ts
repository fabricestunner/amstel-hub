import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { FraudSeverity } from '@prisma/client';

import {
  PaginationQueryDto,
  paginate,
} from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Sliding-window thresholds for redemption velocity (per user). */
const VELOCITY_WINDOW_MS = 60 * 1000;
const VELOCITY_LIMIT = 10;

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Raise a fraud flag. Safe to call from request paths (never throws). */
  async flag(params: {
    userId?: string | null;
    type: string;
    severity?: FraudSeverity;
    details?: unknown;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.fraudFlag.create({
        data: {
          userId: params.userId ?? undefined,
          type: params.type,
          severity: params.severity ?? 'LOW',
          details: (params.details as object) ?? undefined,
          ipAddress: params.ipAddress ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to record fraud flag: ${(err as Error).message}`);
    }
  }

  /**
   * Count a user's redemptions in the recent window; flag + return true when
   * the rate looks abusive. Callers can use the result to throttle/deny.
   */
  async checkRedemptionVelocity(
    userId: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
    const recent = await this.prisma.codeRedemption.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (recent >= VELOCITY_LIMIT) {
      await this.flag({
        userId,
        type: 'RAPID_REDEMPTION',
        severity: 'HIGH',
        details: { recent, windowMs: VELOCITY_WINDOW_MS },
        ipAddress,
      });
      return true;
    }
    return false;
  }

  async list(query: PaginationQueryDto & { status?: string; severity?: string }) {
    const where = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.severity ? { severity: query.severity as never } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.fraudFlag.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          user: { select: { id: true, phone: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.fraudFlag.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async resolve(
    id: string,
    resolverId: string,
    status: 'CONFIRMED' | 'DISMISSED' | 'REVIEWING',
  ) {
    const flag = await this.prisma.fraudFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Fraud flag not found');
    return this.prisma.fraudFlag.update({
      where: { id },
      data: {
        status,
        resolvedById: resolverId,
        resolvedAt: status === 'REVIEWING' ? null : new Date(),
      },
    });
  }
}
