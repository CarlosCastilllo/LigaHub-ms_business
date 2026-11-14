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
import { CreateAficionadoEquipoDto } from './dto/create-aficionado-equipo.dto';
import { UpdateAficionadoEquipoDto } from './dto/update-aficionado-equipo.dto';
import { AficionadoEquipoService } from './aficionado-equipo.service';

@Controller('aficionados-equipos')
export class AficionadoEquipoController {
  constructor(
    private readonly aficionadoEquipoService: AficionadoEquipoService,
  ) {}

  @Post()
  create(@Body() dto: CreateAficionadoEquipoDto) {
    return this.aficionadoEquipoService.create(dto);
  }

  @Get()
  findAll() {
    return this.aficionadoEquipoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.aficionadoEquipoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAficionadoEquipoDto,
  ) {
    return this.aficionadoEquipoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.aficionadoEquipoService.remove(id);
  }
}
