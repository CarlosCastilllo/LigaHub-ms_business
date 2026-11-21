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
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import { FindInscripcionesQueryDto } from './dto/find-inscripciones-query.dto';
import { InscripcionesService } from './inscripciones.service';

@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post()
  create(@Body() dto: CreateInscripcionDto) {
    return this.inscripcionesService.create(dto);
  }

  @Get('reports/torneo/:torneoId/count')
  getCountByTorneo(@Param('torneoId', ParseUUIDPipe) torneoId: string) {
    return this.inscripcionesService.getCountByTorneo(torneoId);
  }

  @Get()
  findAll(@Query() query: FindInscripcionesQueryDto) {
    return this.inscripcionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInscripcionDto,
  ) {
    return this.inscripcionesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.remove(id);
  }
}
