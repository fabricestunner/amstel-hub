import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { OutletRewardsController } from './outlet-rewards.controller';
import { OutletRewardsService } from './outlet-rewards.service';

@Module({
  imports: [NotificationsModule],
  controllers: [OutletRewardsController],
  providers: [OutletRewardsService],
  exports: [OutletRewardsService],
})
export class OutletRewardsModule {}
