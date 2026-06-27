import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Public, Roles } from '../../common/decorators';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  GenerateCodesDto,
  ListCampaignsDto,
  UpdateCampaignDto,
  UpdateCampaignStatusDto,
} from './dto/campaign.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  /** Public: ACTIVE campaigns for customer-facing apps. */
  @Public()
  @Get('active')
  active() {
    return this.campaigns.listActive();
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  list(@Query() query: ListCampaignsDto) {
    return this.campaigns.list(query);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaigns.findById(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser('id') userId: string) {
    return this.campaigns.create(dto, userId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    return this.campaigns.updateStatus(id, dto.status);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaigns.softDelete(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post(':id/codes/generate')
  generateCodes(@Param('id') id: string, @Body() dto: GenerateCodesDto) {
    return this.campaigns.generateCodes(id, dto);
  }
}
