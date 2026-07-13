import { ApiPropertyOptional } from '@nestjs/swagger';
import { CodeStatus, CodeType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query for the cross-outlet voucher archive. Inherits page/limit/search/
 * sortOrder from PaginationQueryDto. ValidationPipe runs with
 * `forbidNonWhitelisted`, so every accepted param must be declared here.
 */
export class ListVouchersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CodeStatus })
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @ApiPropertyOptional({ enum: CodeType })
  @IsOptional()
  @IsEnum(CodeType)
  type?: CodeType;

  @ApiPropertyOptional({ description: 'Filter to a single campaign' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Filter to a single outlet' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Filter to a single generation batch' })
  @IsOptional()
  @IsUUID()
  batchId?: string;
}
