import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Read the platform configuration. Any admin role may view it. */
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER', 'REGIONAL_MANAGER')
  @Get()
  getAll() {
    return this.settings.getAll();
  }

  /** Update platform configuration. */
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Put()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
