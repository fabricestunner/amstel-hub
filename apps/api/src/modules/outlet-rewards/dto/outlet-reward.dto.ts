import { ApiPropertyOptional, PartialType, ApiProperty } from '@nestjs/swagger';
import { RedemptionStatus, RewardStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateOutletRewardDto {
  @ApiProperty({ example: '25 Crates of Amstel Beer' })
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

  @ApiProperty({ example: 300, description: 'Points required (1 crate = 1 point)' })
  @IsInt()
  @Min(0)
  pointsCost!: number;

  @ApiPropertyOptional({
    description:
      'Inventory cap (null = unlimited). Omit to leave unchanged on update; pass null explicitly to clear an existing cap.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  totalInventory?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateOutletRewardDto extends PartialType(CreateOutletRewardDto) {
  @ApiPropertyOptional({ enum: RewardStatus })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}

export class ListOutletRewardsDto extends PaginationQueryDto {}

export class ListOutletRewardRedemptionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RedemptionStatus })
  @IsOptional()
  @IsEnum(RedemptionStatus)
  status?: RedemptionStatus;
}
