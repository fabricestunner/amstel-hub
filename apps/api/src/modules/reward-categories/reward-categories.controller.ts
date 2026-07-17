import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators';
import {
  CreateRewardCategoryDto,
  UpdateRewardCategoryDto,
} from './dto/reward-category.dto';
import { RewardCategoriesService } from './reward-categories.service';

@ApiTags('reward-categories')
@ApiBearerAuth()
@Controller('reward-categories')
export class RewardCategoriesController {
  constructor(private readonly categories: RewardCategoriesService) {}

  /** Any authenticated admin can read the list (needed to fill the reward form). */
  @Get()
  list() {
    return this.categories.list();
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post()
  create(@Body() dto: CreateRewardCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRewardCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
