import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

/** Typed shape of the platform settings the admin console manages. */
export interface PlatformSettings {
  programName: string;
  pointsLabel: string;
  defaultPointsPerCode: number;
  defaultPointsExpiryDays: number;
  supportEmail: string;
}

const DEFAULTS: PlatformSettings = {
  programName: 'Amstel Rewards',
  pointsLabel: 'points',
  defaultPointsPerCode: 20,
  defaultPointsExpiryDays: 180,
  supportEmail: 'support@amstel.com',
};

/** Keys stored as integers in the key-value table. */
const NUMERIC_KEYS = new Set<keyof PlatformSettings>([
  'defaultPointsPerCode',
  'defaultPointsExpiryDays',
]);

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the merged settings (defaults overlaid with persisted overrides). */
  async getAll(): Promise<PlatformSettings> {
    const rows = await this.prisma.platformSetting.findMany();
    const settings: PlatformSettings = { ...DEFAULTS };

    for (const row of rows) {
      const key = row.key as keyof PlatformSettings;
      if (!(key in DEFAULTS)) continue;
      if (NUMERIC_KEYS.has(key)) {
        (settings[key] as number) = Number(row.value);
      } else {
        (settings[key] as string) = row.value;
      }
    }
    return settings;
  }

  /** Upserts only the keys present in the DTO, then returns the merged result. */
  async update(dto: UpdateSettingsDto): Promise<PlatformSettings> {
    const entries = Object.entries(dto).filter(
      ([, value]) => value !== undefined,
    );

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    );

    return this.getAll();
  }
}
