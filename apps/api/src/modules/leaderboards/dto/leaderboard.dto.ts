import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaderboardType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

class BaseLeaderboardQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: 'Period key, e.g. "2026-06" or "ALL"' })
  @IsOptional()
  @IsString()
  period?: string;
}

const CUSTOMER_TYPES = ['CUSTOMER_MONTHLY', 'CUSTOMER_LIFETIME'] as const;
const OUTLET_TYPES = [
  'OUTLET_NATIONAL',
  'OUTLET_REGIONAL',
  'OUTLET_CAMPAIGN',
] as const;

export class CustomerLeaderboardQuery extends BaseLeaderboardQuery {
  @ApiProperty({ enum: CUSTOMER_TYPES })
  @IsEnum(LeaderboardType)
  type!: LeaderboardType;
}

export class OutletLeaderboardQuery extends BaseLeaderboardQuery {
  @ApiProperty({ enum: OUTLET_TYPES })
  @IsEnum(LeaderboardType)
  type!: LeaderboardType;

  @ApiPropertyOptional({ description: 'Required for OUTLET_REGIONAL' })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
