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
import { CreatePelotaDto } from './dto/create-pelota.dto';
import { UpdatePelotaDto } from './dto/update-pelota.dto';
import { PelotasService } from './pelotas.service';

@Controller('pelotas')
export class PelotasController {
  constructor(private readonly pelotasService: PelotasService) {}

  @Post()
  create(@Body() dto: CreatePelotaDto) {
    return this.pelotasService.create(dto);
  }

  @Get()
  findAll() {
    return this.pelotasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pelotasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePelotaDto,
  ) {
    return this.pelotasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pelotasService.remove(id);
  }
}
