import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { FindAnotacionesQueryDto } from './dto/find-anotaciones-query.dto';
import { UpdateAnotacionDto } from './dto/update-anotacion.dto';

// HU-GC-07: goles de los partidos.
@Controller('anotaciones')
export class AnotacionesController {
  constructor(private readonly anotacionesService: AnotacionesService) {}

  @Post()
  create(
    @Body() dto: CreateAnotacionDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.anotacionesService.create(dto, authorization);
  }

  // ?partido_id= lista los goles de un partido ordenados por minuto.
  @Get()
  findAll(@Query() query: FindAnotacionesQueryDto) {
    return this.anotacionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.anotacionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnotacionDto,
  ) {
    return this.anotacionesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.anotacionesService.remove(id);
  }
}
