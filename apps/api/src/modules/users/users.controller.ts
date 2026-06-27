import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators';
import {
  ListUsersQueryDto,
  UpdateProfileDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
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

  /** Update the authenticated user's own profile. */
  @Patch('me')
  updateMe(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(current.id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  /** Admin — view a user's wallet balance. */
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get(':id/wallet')
  getWallet(@Param('id') id: string) {
    return this.users.getWallet(id);
  }

  /** Admin — change a user's status (cannot target SUPER_ADMIN). */
  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.users.updateStatus(id, dto);
  }

  /** SUPER_ADMIN only — change a user's role. */
  @Roles('SUPER_ADMIN')
  @Patch(':id/role')
  updateRole(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.users.updateRole(current.id, id, dto);
  }
}
