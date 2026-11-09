import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateEscenarioTorneoDto } from './dto/create-escenario-torneo.dto';
import { UpdateEscenarioTorneoDto } from './dto/update-escenario-torneo.dto';
import { EscenariosTorneoService } from './escenarios-torneo.service';

@Controller('escenarios-torneo')
export class EscenariosTorneoController {
  constructor(
    private readonly escenariosTorneoService: EscenariosTorneoService,
  ) {}

  @Post()
  create(@Body() dto: CreateEscenarioTorneoDto) {
    return this.escenariosTorneoService.create(dto);
  }

  @Get('reports/torneo/:torneoId/count')
  getCountByTorneo(@Param('torneoId', ParseUUIDPipe) torneoId: string) {
    return this.escenariosTorneoService.getCountByTorneo(torneoId);
  }

  @Get()
  findAll() {
    return this.escenariosTorneoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.escenariosTorneoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscenarioTorneoDto,
  ) {
    return this.escenariosTorneoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.escenariosTorneoService.remove(id);
  }
}
