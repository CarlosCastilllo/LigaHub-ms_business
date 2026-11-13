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
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { UpdateAnotacionDto } from './dto/update-anotacion.dto';

@Controller('anotaciones')
export class AnotacionesController {
  constructor(private readonly anotacionesService: AnotacionesService) {}

  @Post()
  create(@Body() dto: CreateAnotacionDto) {
    return this.anotacionesService.create(dto);
  }

  @Get()
  findAll() {
    return this.anotacionesService.findAll();
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
