import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/; // E.164-ish
// Legal drinking age — customers must be 18+.
const MAX_BIRTH_YEAR = new Date().getFullYear() - 18;

export class RegisterDto {
  @ApiPropertyOptional({ example: '+250788123456' })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ example: 1995, description: 'Year of birth (must be 18 or older)' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(MAX_BIRTH_YEAR, { message: 'You must be at least 18 years old to sign up' })
  yearOfBirth!: number;

  @ApiPropertyOptional({ description: 'Outlet code the customer registered at' })
  @IsOptional()
  @IsString()
  outletCode?: string;
}

export class LoginDto {
  @ApiProperty({ example: '+254712345678' })
  @IsString()
  @IsNotEmpty()
  identifier!: string; // phone or email

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+250788123456 or jane@example.com' })
  @IsString()
  @IsNotEmpty()
  identifier!: string; // phone or email used at registration

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+250788123456 or jane@example.com' })
  @IsString()
  @IsNotEmpty()
  identifier!: string; // phone or email

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
