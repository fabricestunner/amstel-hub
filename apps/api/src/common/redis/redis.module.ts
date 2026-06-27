import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

/** Globally available best-effort Redis cache. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
