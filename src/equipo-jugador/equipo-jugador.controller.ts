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
import { CreateEquipoJugadorDto } from './dto/create-equipo-jugador.dto';
import { UpdateEquipoJugadorDto } from './dto/update-equipo-jugador.dto';
import { EquipoJugadorService } from './equipo-jugador.service';

@Controller('equipo-jugador')
export class EquipoJugadorController {
  constructor(private readonly equipoJugadorService: EquipoJugadorService) {}

  @Post()
  create(@Body() dto: CreateEquipoJugadorDto) {
    return this.equipoJugadorService.create(dto);
  }

  @Get()
  findAll() {
    return this.equipoJugadorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.equipoJugadorService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipoJugadorDto,
  ) {
    return this.equipoJugadorService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.equipoJugadorService.remove(id);
  }
}
