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
import { CreateHabilidadJugadorDto } from './dto/create-habilidad-jugador.dto';
import { UpdateHabilidadJugadorDto } from './dto/update-habilidad-jugador.dto';
import { HabilidadJugadorService } from './habilidad-jugador.service';

@Controller('habilidad-jugador')
export class HabilidadJugadorController {
  constructor(
    private readonly habilidadJugadorService: HabilidadJugadorService,
  ) {}

  @Post()
  create(@Body() dto: CreateHabilidadJugadorDto) {
    return this.habilidadJugadorService.create(dto);
  }

  @Get()
  findAll() {
    return this.habilidadJugadorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.habilidadJugadorService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabilidadJugadorDto,
  ) {
    return this.habilidadJugadorService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.habilidadJugadorService.remove(id);
  }
}
