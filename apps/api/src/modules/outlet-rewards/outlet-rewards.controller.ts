import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, Roles } from '../../common/decorators';
import {
  CreateOutletRewardDto,
  ListOutletRewardRedemptionsDto,
  ListOutletRewardsDto,
  UpdateOutletRewardDto,
} from './dto/outlet-reward.dto';
import { OutletRewardsService } from './outlet-rewards.service';

@ApiTags('outlet-rewards')
@ApiBearerAuth()
@Controller()
export class OutletRewardsController {
  constructor(private readonly outletRewards: OutletRewardsService) {}

  @Get('outlet-rewards')
  list(@Query() query: ListOutletRewardsDto) {
    return this.outletRewards.list(query);
  }

  @Get('outlet-rewards/:id')
  findOne(@Param('id') id: string) {
    return this.outletRewards.findById(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post('outlet-rewards')
  create(@Body() dto: CreateOutletRewardDto) {
    return this.outletRewards.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Put('outlet-rewards/:id')
  update(@Param('id') id: string, @Body() dto: UpdateOutletRewardDto) {
    return this.outletRewards.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Delete('outlet-rewards/:id')
  remove(@Param('id') id: string) {
    return this.outletRewards.softDelete(id);
  }

  @Roles('OUTLET_MANAGER')
  @Post('outlet-rewards/:id/redeem')
  redeem(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.outletId) {
      throw new ForbiddenException('Your account is not linked to an outlet');
    }
    return this.outletRewards.redeem(user.outletId, id, user.id);
  }

  // NOTE: deviates from the original task brief. OutletRewardsService.listRedemptions
  // was hardened after the brief was written to take the full AuthenticatedUser and
  // derive outlet scoping (including the '__none__' sentinel for a manager with no
  // linked outlet) internally, instead of accepting a pre-computed scope id.
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER', 'OUTLET_MANAGER')
  @Get('outlet-reward-redemptions')
  listRedemptions(
    @Query() query: ListOutletRewardRedemptionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletRewards.listRedemptions(query, user);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('outlet-reward-redemptions/:id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.outletRewards.approve(id, approverId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('outlet-reward-redemptions/:id/reject')
  reject(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.outletRewards.reject(id, approverId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch('outlet-reward-redemptions/:id/fulfill')
  fulfill(@Param('id') id: string, @CurrentUser('id') approverId: string) {
    return this.outletRewards.fulfill(id, approverId);
  }
}
