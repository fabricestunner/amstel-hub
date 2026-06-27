import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CampaignStatus, CodeType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Slam 2026' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'summer-slam-2026' })
  @IsString()
  @Length(2, 140)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ description: 'ISO start datetime' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ description: 'ISO end datetime' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerCode?: number;

  @ApiPropertyOptional({ description: 'null = points never expire' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsExpiryDays?: number;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class UpdateCampaignStatusDto {
  @ApiProperty({ enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  status!: CampaignStatus;
}

export class ListCampaignsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

export class GenerateCodesDto {
  @ApiProperty({ description: 'Number of codes to generate', example: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  count!: number;

  @ApiProperty({ enum: CodeType })
  @IsEnum(CodeType)
  type!: CodeType;

  @ApiPropertyOptional({ description: 'Defaults to campaign.pointsPerCode' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsValue?: number;

  @ApiPropertyOptional({ description: 'ISO expiry datetime for the codes' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
