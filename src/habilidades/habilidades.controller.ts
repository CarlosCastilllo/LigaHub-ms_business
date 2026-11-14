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
import { CreateHabilidadDto } from './dto/create-habilidad.dto';
import { UpdateHabilidadDto } from './dto/update-habilidad.dto';
import { HabilidadesService } from './habilidades.service';

@Controller('habilidades')
export class HabilidadesController {
  constructor(private readonly habilidadesService: HabilidadesService) {}

  @Post()
  create(@Body() dto: CreateHabilidadDto) {
    return this.habilidadesService.create(dto);
  }

  @Get()
  findAll() {
    return this.habilidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.habilidadesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabilidadDto,
  ) {
    return this.habilidadesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.habilidadesService.remove(id);
  }
}
