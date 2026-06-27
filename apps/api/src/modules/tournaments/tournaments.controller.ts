import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Public, Roles } from '../../common/decorators';
import { TournamentsService } from './tournaments.service';
import {
  CreateTournamentDto,
  ListTournamentsDto,
  MatchResultDto,
  UpdateTournamentDto,
  UpdateTournamentStatusDto,
} from './dto/tournament.dto';

@ApiTags('tournaments')
@ApiBearerAuth()
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  /** Public: tournaments open for registration. */
  @Public()
  @Get('open')
  open() {
    return this.tournaments.listOpen();
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Get()
  list(@Query() query: ListTournamentsDto) {
    return this.tournaments.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournaments.findById(id);
  }

  @Get(':id/bracket')
  bracket(@Param('id') id: string) {
    return this.tournaments.getBracket(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournaments.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournaments.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentStatusDto,
  ) {
    return this.tournaments.updateStatus(id, dto.status);
  }

  @Roles('CUSTOMER')
  @Post(':id/register')
  register(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tournaments.register(id, userId);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Post(':id/bracket/generate')
  generateBracket(@Param('id') id: string) {
    return this.tournaments.generateBracket(id);
  }

  @Roles('SUPER_ADMIN', 'CAMPAIGN_MANAGER')
  @Patch(':id/matches/:matchId/result')
  recordResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() dto: MatchResultDto,
  ) {
    return this.tournaments.recordResult(id, matchId, dto);
  }
}
