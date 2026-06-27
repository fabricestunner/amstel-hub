import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ResolveFlagDto {
  @ApiProperty({ enum: ['CONFIRMED', 'DISMISSED', 'REVIEWING'] })
  @IsIn(['CONFIRMED', 'DISMISSED', 'REVIEWING'])
  status!: 'CONFIRMED' | 'DISMISSED' | 'REVIEWING';
}
