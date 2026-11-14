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
import { CreatePosicionEspacialDto } from './dto/create-posicion-espacial.dto';
import { UpdatePosicionEspacialDto } from './dto/update-posicion-espacial.dto';
import { PosicionesEspacialesService } from './posiciones-espaciales.service';

@Controller('posiciones-espaciales')
export class PosicionesEspacialesController {
  constructor(
    private readonly posicionesService: PosicionesEspacialesService,
  ) {}

  @Post()
  create(@Body() dto: CreatePosicionEspacialDto) {
    return this.posicionesService.create(dto);
  }

  @Get()
  findAll() {
    return this.posicionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.posicionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePosicionEspacialDto,
  ) {
    return this.posicionesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.posicionesService.remove(id);
  }
}
