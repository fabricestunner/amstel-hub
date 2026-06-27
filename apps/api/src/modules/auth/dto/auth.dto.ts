import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/; // E.164-ish

export class RegisterDto {
  @ApiProperty({ example: '+254712345678' })
  @Matches(PHONE_REGEX, { message: 'phone must be a valid E.164 number' })
  phone!: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

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
  @ApiProperty({ example: '+254712345678' })
  @IsString()
  phone!: string;

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
  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
