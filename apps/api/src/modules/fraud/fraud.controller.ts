import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ResolveFlagDto } from './dto/fraud.dto';
import { FraudService } from './fraud.service';

@ApiTags('fraud')
@ApiBearerAuth()
@Controller('fraud/flags')
export class FraudController {
  constructor(private readonly fraud: FraudService) {}

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  list(
    @Query() query: PaginationQueryDto & { status?: string; severity?: string },
  ) {
    return this.fraud.list(query);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveFlagDto,
    @CurrentUser('id') resolverId: string,
  ) {
    return this.fraud.resolve(id, resolverId, dto.status);
  }
}
