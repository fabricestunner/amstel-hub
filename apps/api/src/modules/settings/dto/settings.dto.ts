import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** All platform settings are optional on update — only provided keys are written. */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Loyalty program display name' })
  @IsOptional()
  @IsString()
  programName?: string;

  @ApiPropertyOptional({ description: 'Label used for points across the UI' })
  @IsOptional()
  @IsString()
  pointsLabel?: string;

  @ApiPropertyOptional({ description: 'Default points awarded per redeemed code' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  defaultPointsPerCode?: number;

  @ApiPropertyOptional({ description: 'Default points expiry in days (0 = never)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  defaultPointsExpiryDays?: number;

  @ApiPropertyOptional({ description: 'Support contact email shown to users' })
  @IsOptional()
  @IsString()
  supportEmail?: string;
}
