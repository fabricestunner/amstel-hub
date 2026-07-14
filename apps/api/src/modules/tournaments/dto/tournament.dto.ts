import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TournamentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTournamentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty({ example: 'Kigali Regional Finals' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  /** Frontend sends maxParticipants; maxPlayers is the canonical DB name. */
  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @IsInt()
  @Min(2)
  maxParticipants?: number;

  @ApiPropertyOptional({ example: 16, deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(2)
  maxPlayers?: number;

  /** Frontend sends entryPoints; entryPointsCost is the canonical DB name. */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  entryPoints?: number;

  @ApiPropertyOptional({ default: 0, deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  entryPointsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prizePool?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  /** Frontend sends startDate */
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  /** Frontend sends endDate */
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {}

export class UpdateTournamentStatusDto {
  @ApiProperty({ enum: TournamentStatus })
  @IsEnum(TournamentStatus)
  status!: TournamentStatus;
}

export class ListTournamentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TournamentStatus })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class MatchResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  winnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  scoreA?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  scoreB?: number;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  scoreOne?: number;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  scoreTwo?: number;
}

export class RegisterTournamentDto {
  @ApiProperty({
    description: 'Outlet/bar the customer chooses to represent; must be one where they have scanned a code',
  })
  @IsUUID()
  outletId!: string;
}
