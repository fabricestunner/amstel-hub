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
  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiProperty({ example: 'Lagos Regional Finals' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  venue!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 80)
  city!: string;

  @ApiProperty({ example: 16 })
  @IsInt()
  @Min(2)
  maxPlayers!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  entryPointsCost?: number;

  @ApiProperty()
  @IsDateString()
  registrationDeadline!: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

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
  @ApiProperty()
  @IsUUID()
  winnerId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  scoreOne!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  scoreTwo!: number;
}
