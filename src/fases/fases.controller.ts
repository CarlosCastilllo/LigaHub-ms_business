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
import { AsignarEquiposGrupoDto } from './dto/asignar-equipos-grupo.dto';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';
import { CreateFaseDto } from './dto/create-fase.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FasesService } from './fases.service';

@Controller('fases')
export class FasesController {
  constructor(private readonly fasesService: FasesService) {}

  @Post()
  create(@Body() dto: CreateFaseDto) {
    return this.fasesService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindFasesQueryDto) {
    return this.fasesService.findAll(query);
  }

  @Get(':id/equipos')
  findEquiposGrupo(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.findEquiposGrupo(id);
  }

  @Post(':id/equipos')
  asignarEquiposGrupo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarEquiposGrupoDto,
  ) {
    return this.fasesService.asignarEquiposGrupo(id, dto);
  }

  @Delete(':id/equipos/:equipoId')
  quitarEquipoGrupo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
  ) {
    return this.fasesService.quitarEquipoGrupo(id, equipoId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFaseDto) {
    return this.fasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.remove(id);
  }
}
