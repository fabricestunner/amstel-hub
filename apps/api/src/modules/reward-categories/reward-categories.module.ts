import { Module } from '@nestjs/common';

import { RewardCategoriesController } from './reward-categories.controller';
import { RewardCategoriesService } from './reward-categories.service';

@Module({
  controllers: [RewardCategoriesController],
  providers: [RewardCategoriesService],
  exports: [RewardCategoriesService],
})
export class RewardCategoriesModule {}
