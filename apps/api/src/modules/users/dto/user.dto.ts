import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, UserRole, UserStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Roles an admin may assign when creating a staff member or customer. */
const CREATABLE_ROLES = [
  'CUSTOMER',
  'CAMPAIGN_MANAGER',
  'REGIONAL_MANAGER',
  'OUTLET_MANAGER',
  'PROMOTER',
] as const;
export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export class CreateUserDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Phone number (E.164, e.g. +250788123456)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: CREATABLE_ROLES, description: 'Role to assign' })
  @IsEnum(CREATABLE_ROLES)
  role!: CreatableRole;

  @ApiProperty({ description: 'Initial password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
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

// Legal drinking age — customers must be 18+.
const MAX_CUSTOMER_BIRTH_YEAR = new Date().getFullYear() - 18;

/**
 * Outlet-manager walk-in registration. The outlet is taken from the
 * authenticated manager, never from the request body.
 */
export class RegisterOutletCustomerDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Phone number (E.164, e.g. +250788123456)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Initial password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Customer gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: 1995,
    description: 'Year of birth (must be 18 or older)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(MAX_CUSTOMER_BIRTH_YEAR, {
    message: 'Customer must be at least 18 years old',
  })
  yearOfBirth?: number;
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

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number (E.164, e.g. +250788123456)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;
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

  @ApiProperty({ description: 'New password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
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
