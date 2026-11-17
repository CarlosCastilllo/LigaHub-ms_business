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
import { CreateEquipoDeporteDto } from './dto/create-equipo-deporte.dto';
import { FindEquiposDeportesQueryDto } from './dto/find-equipos-deportes-query.dto';
import { UpdateEquipoDeporteDto } from './dto/update-equipo-deporte.dto';
import { EquiposDeportesService } from './equipos-deportes.service';

@Controller('equipos-deportes')
export class EquiposDeportesController {
  constructor(
    private readonly equiposDeportesService: EquiposDeportesService,
  ) {}

  @Post()
  create(@Body() dto: CreateEquipoDeporteDto) {
    return this.equiposDeportesService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindEquiposDeportesQueryDto) {
    return this.equiposDeportesService.findAll(query.equipo_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.equiposDeportesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipoDeporteDto,
  ) {
    return this.equiposDeportesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.equiposDeportesService.remove(id);
  }
}
