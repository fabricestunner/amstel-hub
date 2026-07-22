import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators';
import { OutletsService } from './outlets.service';
import {
  CreateOutletDto,
  ListOutletsDto,
  OutletCustomerLeaderboardQueryDto,
  OutletVouchersQueryDto,
  RedemptionHistoryQueryDto,
  UpdateOutletDto,
} from './dto/outlet.dto';

@ApiTags('outlets')
@ApiBearerAuth()
@Controller('outlets')
export class OutletsController {
  constructor(private readonly outlets: OutletsService) {}

  @Get('regions')
  regions() {
    return this.outlets.listRegions();
  }

  @Get('provinces')
  provinces(@Query('regionId') regionId?: string) {
    return this.outlets.listProvinces(regionId);
  }

  @Get('districts')
  districts(@Query('provinceId') provinceId?: string) {
    return this.outlets.listDistricts(provinceId);
  }

  @Roles('CUSTOMER')
  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.outlets.listCustomerOutlets(userId);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get()
  list(
    @Query() query: ListOutletsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outlets.list(query, user);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outlets.findById(id, user);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get(':id/dashboard')
  dashboard(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outlets.dashboard(id, user);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get(':id/customers/leaderboard')
  customerLeaderboard(
    @Param('id') id: string,
    @Query() query: OutletCustomerLeaderboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outlets.customerLeaderboard(id, query, user);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get(':id/redemptions')
  redemptionHistory(
    @Param('id') id: string,
    @Query() query: RedemptionHistoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outlets.redemptionHistory(id, query, user);
  }

  @Roles('SUPER_ADMIN', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
  @Get(':id/vouchers')
  vouchers(
    @Param('id') id: string,
    @Query() query: OutletVouchersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outlets.listVouchers(id, query, user);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateOutletDto) {
    return this.outlets.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOutletDto) {
    return this.outlets.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.outlets.softDelete(id);
  }
}
