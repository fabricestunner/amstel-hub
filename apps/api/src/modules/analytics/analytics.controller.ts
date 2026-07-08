import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators';
import { AnalyticsService } from './analytics.service';
import { TrendsQueryDto } from './dto/analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER', 'REGIONAL_MANAGER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.overview(user);
  }

  @Get('trends')
  trends(
    @Query() query: TrendsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analytics.trends(query.days, user);
  }

  @Get('demographics')
  demographics(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.demographics(user);
  }
}
