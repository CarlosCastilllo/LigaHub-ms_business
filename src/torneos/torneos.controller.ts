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
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import { TorneoDesarrolloService } from './torneo-desarrollo.service';
import { TorneosService } from './torneos.service';

@Controller('torneos')
export class TorneosController {
  constructor(
    private readonly torneosService: TorneosService,
    private readonly torneoDesarrolloService: TorneoDesarrolloService,
  ) {}

  @Post()
  create(@Body() dto: CreateTorneoDto) {
    return this.torneosService.create(dto);
  }

  @Get()
  findAll() {
    return this.torneosService.findAll();
  }

  @Get(':id/fases')
  findFases(@Param('id', ParseUUIDPipe) id: string) {
    return this.torneosService.findFases(id);
  }

  // HU-GC-08: estructura y desarrollo del torneo en una sola consulta.
  @Get(':id/desarrollo')
  findDesarrollo(@Param('id', ParseUUIDPipe) id: string) {
    return this.torneoDesarrolloService.findDesarrollo(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.torneosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTorneoDto) {
    return this.torneosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.torneosService.remove(id);
  }
}
