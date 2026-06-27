import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const ALLOWED_FOLDERS = ['avatars', 'rewards', 'campaigns', 'reports', 'misc'];

export class PresignUploadDto {
  @ApiProperty({ example: 'reward-tshirt.png' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  @Matches(/^[\w.-]+\/[\w.+-]+$/, { message: 'contentType must be a valid MIME type' })
  contentType!: string;

  @ApiPropertyOptional({ enum: ALLOWED_FOLDERS, default: 'misc' })
  @IsOptional()
  @IsIn(ALLOWED_FOLDERS)
  folder: string = 'misc';
}

export class PresignDownloadDto {
  @ApiProperty({ description: 'Object key returned at upload time' })
  @IsString()
  key!: string;
}
