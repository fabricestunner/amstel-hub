import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MinLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Roles an admin may assign when creating a staff member (never CUSTOMER here). */
const STAFF_ROLES = [
  'CAMPAIGN_MANAGER',
  'REGIONAL_MANAGER',
  'OUTLET_MANAGER',
  'PROMOTER',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export class CreateUserDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName!: string;

  @ApiProperty({ description: 'Phone number (E.164, e.g. +250788123456)' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: STAFF_ROLES, description: 'Staff role to assign' })
  @IsEnum(STAFF_ROLES)
  role!: StaffRole;

  @ApiProperty({ description: 'Initial password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: 'Region to scope a REGIONAL_MANAGER to' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Outlet to assign an OUTLET_MANAGER to' })
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

const SETTABLE_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
export type SettableStatus = (typeof SETTABLE_STATUSES)[number];

export class UpdateUserStatusDto {
  @ApiProperty({ enum: SETTABLE_STATUSES })
  @IsEnum(SETTABLE_STATUSES)
  status!: SettableStatus;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Only return staff (non-customer) accounts' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  staffOnly?: boolean;
}
