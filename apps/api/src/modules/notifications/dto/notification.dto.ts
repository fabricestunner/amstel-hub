import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListNotificationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sms?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() push?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() promotions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tournaments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rewards?: boolean;
}
