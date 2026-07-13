import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser, Roles } from '../../common/decorators';
import { ListVouchersDto } from './dto/voucher.dto';
import { VouchersService } from './vouchers.service';

@ApiTags('vouchers')
@ApiBearerAuth()
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  @ApiOperation({ summary: 'Cross-outlet archive of every generated voucher' })
  list(@Query() query: ListVouchersDto) {
    return this.vouchers.list(query);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  @ApiOperation({
    summary: 'Void a voucher (never a hard delete; 409 if already redeemed)',
  })
  void(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vouchers.void(id, user.id);
  }

  @Roles('SUPER_ADMIN')
  @Post('batch/:batchId/void')
  @ApiOperation({ summary: 'Void every ACTIVE voucher in a batch' })
  voidBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vouchers.voidBatch(batchId, user.id);
  }
}
