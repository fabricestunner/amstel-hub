import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import QRCode from 'qrcode';

import { CryptoService } from '../../common/crypto/crypto.service';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCampaignDto,
  GenerateCodesDto,
  ListCampaignsDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

/** Allowed status transitions for the campaign lifecycle state machine. */
const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['SCHEDULED', 'ACTIVE', 'ARCHIVED'],
  SCHEDULED: ['ACTIVE', 'PAUSED', 'ENDED', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'ENDED', 'ARCHIVED'],
  PAUSED: ['ACTIVE', 'ENDED', 'ARCHIVED'],
  ENDED: ['ARCHIVED'],
  ARCHIVED: [],
};

const CODE_BATCH_SIZE = 5_000;

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async list(query: ListCampaignsDto) {
    const where: Prisma.CampaignWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          _count: { select: { codes: true } },
          codes: { select: { redemption: { select: { id: true } } } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    const mapped = items.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status.toLowerCase(),
      pointsPerCode: c.pointsPerCode,
      startDate: c.startsAt.toISOString(),
      endDate: c.endsAt?.toISOString() ?? null,
      codesGenerated: c._count.codes,
      codesRedeemed: c.codes.filter((lc) => lc.redemption !== null).length,
    }));
    return paginate(mapped, total, query);
  }

  /** Public listing of currently ACTIVE campaigns for customers. */
  async listActive() {
    return this.prisma.campaign.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { startsAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        bannerUrl: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(dto: CreateCampaignDto, createdById: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        bannerUrl: dto.bannerUrl,
        startsAt,
        endsAt,
        pointsPerCode: dto.pointsPerCode ?? 1,
        pointsExpiryDays: dto.pointsExpiryDays,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findById(id);
    const data: Prisma.CampaignUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.bannerUrl !== undefined ? { bannerUrl: dto.bannerUrl } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
      ...(dto.pointsPerCode !== undefined
        ? { pointsPerCode: dto.pointsPerCode }
        : {}),
      ...(dto.pointsExpiryDays !== undefined
        ? { pointsExpiryDays: dto.pointsExpiryDays }
        : {}),
    };
    return this.prisma.campaign.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: CampaignStatus) {
    const campaign = await this.findById(id);
    if (campaign.status === status) return campaign;
    const allowed = STATUS_TRANSITIONS[campaign.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition campaign from ${campaign.status} to ${status}`,
      );
    }
    return this.prisma.campaign.update({ where: { id }, data: { status } });
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /**
   * Bulk-generates N unique loyalty codes for a campaign. Each code is a
   * human-friendly `AMSTEL-XXXX-XXXX` string; only its sha-256 hash and an
   * AES-GCM ciphertext are persisted. Raw codes are returned only outside
   * production so an operator can distribute them once.
   */
  async generateCodes(campaignId: string, dto: GenerateCodesDto) {
    const campaign = await this.findById(campaignId);
    const pointsValue = dto.pointsValue ?? campaign.pointsPerCode;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const batchId = randomUUID();

    // Build unique codes in memory (dedupe defensively against hash collisions).
    const seen = new Set<string>();
    const rawCodes: string[] = [];
    while (rawCodes.length < dto.count) {
      const code = this.randomCode();
      if (seen.has(code)) continue;
      seen.add(code);
      rawCodes.push(code);
    }

    const rows: Prisma.LoyaltyCodeCreateManyInput[] = rawCodes.map((code) => ({
      campaignId,
      outletId: dto.outletId,
      type: dto.type,
      codeHash: this.crypto.hash(code),
      codeCipher: this.crypto.encrypt(code),
      pointsValue,
      batchId,
      expiresAt,
    }));

    let generated = 0;
    for (let i = 0; i < rows.length; i += CODE_BATCH_SIZE) {
      const chunk = rows.slice(i, i + CODE_BATCH_SIZE);
      const res = await this.prisma.loyaltyCode.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      generated += res.count;
    }

    return {
      generated,
      batchId,
      pointsValue,
      codes: rawCodes,
    };
  }

  async listCodes(
    campaignId: string,
    query: {
      page?: number;
      limit?: number;
      batchId?: string;
      status?: string;
    },
  ) {
    await this.findById(campaignId);
    const take = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * take;
    const where = {
      campaignId,
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(query.status ? { status: query.status as any } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.loyaltyCode.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          pointsValue: true,
          status: true,
          batchId: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.loyaltyCode.count({ where }),
    ]);
    return paginate(
      items,
      total,
      { page, limit: take } as any,
    );
  }

  async generateQr(campaignId: string, codeId: string): Promise<Buffer> {
    const code = await this.prisma.loyaltyCode.findFirst({
      where: { id: codeId, campaignId },
    });
    if (!code) throw new NotFoundException('Code not found');
    const plain = this.crypto.decrypt(code.codeCipher);
    return QRCode.toBuffer(plain, { type: 'png', width: 300, margin: 2 });
  }

  /** Generates `AMSTEL-XXXX-XXXX` with uppercase hex segments. */
  private randomCode(): string {
    const seg = () => randomBytes(2).toString('hex').toUpperCase();
    return `AMSTEL-${seg()}-${seg()}`;
  }
}
