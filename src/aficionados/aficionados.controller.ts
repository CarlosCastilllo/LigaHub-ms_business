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
import { AficionadosService } from './aficionados.service';
import { CreateAficionadoDto } from './dto/create-aficionado.dto';
import { UpdateAficionadoDto } from './dto/update-aficionado.dto';

@Controller('aficionados')
export class AficionadosController {
  constructor(private readonly aficionadosService: AficionadosService) {}

  @Post()
  create(@Body() dto: CreateAficionadoDto) {
    return this.aficionadosService.create(dto);
  }

  @Get()
  findAll() {
    return this.aficionadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.aficionadosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAficionadoDto,
  ) {
    return this.aficionadosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.aficionadosService.remove(id);
  }
}
