import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class RedeemCodeDto {
  @ApiProperty({ description: 'Raw promo / QR / bottle code', example: 'AMSTEL-7KQ9-XP2M' })
  @IsString()
  @Length(4, 64)
  code!: string;

  @ApiPropertyOptional({ description: 'Outlet code where redemption happened' })
  @IsOptional()
  @IsString()
  outletCode?: string;

  @ApiPropertyOptional({ description: 'Client device identifier (anti-fraud)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  geoLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  geoLng?: number;
}
