import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RedemptionStatus, RewardStatus, RewardType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateRewardDto {
  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiProperty({ example: 'Branded Cooler Box' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  type!: RewardType;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  pointsCost!: number;

  @ApiPropertyOptional({ description: 'null = unlimited inventory' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalInventory?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateRewardDto extends PartialType(CreateRewardDto) {
  @ApiPropertyOptional({ enum: RewardStatus })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}

export class ListRewardsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ enum: RewardType })
  @IsOptional()
  @IsEnum(RewardType)
  type?: RewardType;
}

export class RedeemRewardDto {
  @ApiPropertyOptional({
    description: 'Required when reward.type === TOURNAMENT_ENTRY',
  })
  @IsOptional()
  @IsUUID()
  tournamentId?: string;

  @ApiProperty({
    description: 'Outlet/bar where the customer will collect their reward',
  })
  @IsUUID()
  collectionOutletId!: string;
}

export class ListRedemptionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RedemptionStatus })
  @IsOptional()
  @IsEnum(RedemptionStatus)
  status?: RedemptionStatus;
}
