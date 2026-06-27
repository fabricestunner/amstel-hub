import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('SUPER_ADMIN')
  @Get()
  list(
    @Query() query: PaginationQueryDto & { entityType?: string; actorId?: string },
  ) {
    return this.audit.list(query);
  }
}
