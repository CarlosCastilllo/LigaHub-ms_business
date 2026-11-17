import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEquipoJugadorDto } from './dto/create-equipo-jugador.dto';
import { FindEquipoJugadorQueryDto } from './dto/find-equipo-jugador-query.dto';
import { RetirarEquipoJugadorDto } from './dto/retirar-equipo-jugador.dto';
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
  findAll(@Query() query: FindEquipoJugadorQueryDto) {
    return this.equipoJugadorService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.equipoJugadorService.findOne(id);
  }

  @Patch(':id/retiro')
  retirar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetirarEquipoJugadorDto,
  ) {
    return this.equipoJugadorService.retirar(id, dto);
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
