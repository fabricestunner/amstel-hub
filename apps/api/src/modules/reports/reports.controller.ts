import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
// All report-capable roles are admitted here; the service enforces which
// report `type` each role (and outlet scope) may actually read.
@Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER', 'REGIONAL_MANAGER', 'OUTLET_MANAGER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * Streams a report as CSV. `@Res()` puts the handler in library-specific mode
   * so the global TransformInterceptor does NOT wrap the body in
   * `{ success, data }` — we write the raw CSV to the response ourselves.
   */
  @Get(':type')
  async export(
    @Param('type') type: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, csv } = await this.reports.buildCsv(type, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
