import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let db = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'ok' ? 'healthy' : 'degraded',
      checks: { database: db },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
