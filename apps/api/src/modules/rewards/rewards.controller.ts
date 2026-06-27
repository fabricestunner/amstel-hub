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

import { CurrentUser, Roles } from '../../common/decorators';
import { RewardsService } from './rewards.service';
import {
  CreateRewardDto,
  ListRedemptionsDto,
  ListRewardsDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller()
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get('rewards')
  list(@Query() query: ListRewardsDto) {
    return this.rewards.list(query);
  }

  @Get('rewards/:id')
  findOne(@Param('id') id: string) {
    return this.rewards.findById(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post('rewards')
  create(@Body() dto: CreateRewardDto) {
    return this.rewards.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Put('rewards/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.rewards.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Delete('rewards/:id')
  remove(@Param('id') id: string) {
    return this.rewards.softDelete(id);
  }

  @Roles('CUSTOMER')
  @Post('rewards/:id/redeem')
  redeem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.rewards.redeem(userId, id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get('reward-redemptions')
  listRedemptions(@Query() query: ListRedemptionsDto) {
    return this.rewards.listRedemptions(query);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('reward-redemptions/:id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.rewards.approve(id, approverId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('reward-redemptions/:id/reject')
  reject(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.rewards.reject(id, approverId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('reward-redemptions/:id/fulfill')
  fulfill(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.rewards.fulfill(id, approverId);
  }
}
