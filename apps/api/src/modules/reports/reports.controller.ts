import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Roles } from '../../common/decorators';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private sendCsv(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('customers.csv')
  async customers(@Res() res: Response) {
    this.sendCsv(res, 'customers.csv', await this.reports.customersCsv());
  }

  @Get('outlets.csv')
  async outlets(@Res() res: Response) {
    this.sendCsv(res, 'outlets.csv', await this.reports.outletsCsv());
  }

  @Get('transactions.csv')
  async transactions(
    @Res() res: Response,
    @Query('campaignId') campaignId?: string,
  ) {
    this.sendCsv(
      res,
      'transactions.csv',
      await this.reports.transactionsCsv(campaignId),
    );
  }

  private sendXlsx(res: Response, filename: string, buf: Buffer) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  @Get('customers.xlsx')
  async customersXlsx(@Res() res: Response) {
    this.sendXlsx(res, 'customers.xlsx', await this.reports.customersXlsx());
  }

  @Get('outlets.xlsx')
  async outletsXlsx(@Res() res: Response) {
    this.sendXlsx(res, 'outlets.xlsx', await this.reports.outletsXlsx());
  }

  @Get('transactions.xlsx')
  async transactionsXlsx(
    @Res() res: Response,
    @Query('campaignId') campaignId?: string,
  ) {
    this.sendXlsx(res, 'transactions.xlsx', await this.reports.transactionsXlsx(campaignId));
  }
}
