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
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { JugadoresService } from './jugadores.service';

@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  @Post()
  create(@Body() dto: CreateJugadorDto) {
    return this.jugadoresService.create(dto);
  }

  @Get()
  findAll() {
    return this.jugadoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jugadoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJugadorDto,
  ) {
    return this.jugadoresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.jugadoresService.remove(id);
  }
}
