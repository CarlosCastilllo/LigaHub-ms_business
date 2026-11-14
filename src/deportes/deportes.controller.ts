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
import { CreateDeporteDto } from './dto/create-deporte.dto';
import { UpdateDeporteDto } from './dto/update-deporte.dto';
import { DeportesService } from './deportes.service';

@Controller('deportes')
export class DeportesController {
  constructor(private readonly deportesService: DeportesService) {}

  @Post()
  create(@Body() dto: CreateDeporteDto) {
    return this.deportesService.create(dto);
  }

  @Get()
  findAll() {
    return this.deportesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deportesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeporteDto,
  ) {
    return this.deportesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deportesService.remove(id);
  }
}
