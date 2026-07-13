import { Module } from '@nestjs/common';

import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

// AuditModule is @Global, so AuditService needs no explicit import here.
@Module({
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
