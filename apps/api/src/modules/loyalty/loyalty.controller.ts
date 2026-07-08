import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { LoyaltyService } from './loyalty.service';
import { RedeemCodeDto } from './dto/loyalty.dto';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Roles('CUSTOMER', 'PROMOTER')
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // anti brute-force on codes
  @Post('redeem')
  redeem(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemCodeDto,
    @Req() req: Request,
  ) {
    return this.loyalty.redeemCode(userId, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('wallet')
  wallet(@CurrentUser('id') userId: string) {
    return this.loyalty.getWallet(userId);
  }

  @Get('transactions')
  transactions(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.loyalty.getTransactions(userId, query);
  }
}
