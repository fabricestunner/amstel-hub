import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { LeaderboardsService } from './leaderboards.service';
import {
  CustomerLeaderboardQuery,
  OutletLeaderboardQuery,
} from './dto/leaderboard.dto';

@ApiTags('leaderboards')
@ApiBearerAuth()
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  @Get('customers')
  customers(@Query() query: CustomerLeaderboardQuery) {
    return this.leaderboards.customers(query);
  }

  @Get('outlets')
  outlets(@Query() query: OutletLeaderboardQuery) {
    return this.leaderboards.outlets(query);
  }
}
