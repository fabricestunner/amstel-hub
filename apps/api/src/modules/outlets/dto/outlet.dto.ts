import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CodeStatus, CodeType, OutletStatus } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateOutletDto {
  @ApiProperty({ example: 'Amstel Arena Bar' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'OUT-LAG-001' })
  @IsString()
  @Length(2, 40)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiProperty()
  @IsUUID()
  provinceId!: string;

  @ApiProperty()
  @IsUUID()
  districtId!: string;

  @ApiPropertyOptional({ description: 'Outlet manager user id' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateOutletDto extends PartialType(CreateOutletDto) {
  @ApiPropertyOptional({ enum: OutletStatus })
  @IsOptional()
  @IsEnum(OutletStatus)
  status?: OutletStatus;
}

export class ListOutletsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OutletStatus })
  @IsOptional()
  @IsEnum(OutletStatus)
  status?: OutletStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;
}

export class RedemptionHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter to a single customer' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class OutletVouchersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CodeStatus })
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @ApiPropertyOptional({ enum: CodeType })
  @IsOptional()
  @IsEnum(CodeType)
  type?: CodeType;
}
