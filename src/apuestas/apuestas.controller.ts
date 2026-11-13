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
import { ApuestasService } from './apuestas.service';
import { CreateApuestaDto } from './dto/create-apuesta.dto';
import { UpdateApuestaDto } from './dto/update-apuesta.dto';

@Controller('apuestas')
export class ApuestasController {
  constructor(private readonly apuestasService: ApuestasService) {}

  @Post()
  create(@Body() dto: CreateApuestaDto) {
    return this.apuestasService.create(dto);
  }

  @Get()
  findAll() {
    return this.apuestasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.apuestasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApuestaDto,
  ) {
    return this.apuestasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.apuestasService.remove(id);
  }
}
