import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators';
import { PresignDownloadDto, PresignUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Get a presigned URL to upload an asset directly to object storage. */
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER', 'OUTLET_MANAGER')
  @Post('presign-upload')
  presignUpload(@Body() dto: PresignUploadDto) {
    return this.storage.presignUpload(dto.folder, dto.filename, dto.contentType);
  }

  /** Get a short-lived URL to download a private object. */
  @Get('presign-download')
  async presignDownload(@Query() dto: PresignDownloadDto) {
    return { url: await this.storage.presignDownload(dto.key) };
  }
}
