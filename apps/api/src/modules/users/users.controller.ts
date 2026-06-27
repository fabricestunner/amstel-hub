import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Current authenticated user's profile, enriched with auth-context scoping
   * (outletId / regionId / permissions) the dashboards rely on. */
  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser) {
    const profile = await this.users.findById(current.id);
    return {
      ...profile,
      outletId: current.outletId,
      regionId: current.regionId,
      permissions: current.permissions,
    };
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.users.list(query);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
