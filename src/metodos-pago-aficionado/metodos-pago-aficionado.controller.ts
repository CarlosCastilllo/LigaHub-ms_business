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
import { CreateMetodoPagoAficionadoDto } from './dto/create-metodo-pago-aficionado.dto';
import { UpdateMetodoPagoAficionadoDto } from './dto/update-metodo-pago-aficionado.dto';
import { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';

@Controller('metodos-pago-aficionado')
export class MetodosPagoAficionadoController {
  constructor(
    private readonly metodosPagoAficionadoService: MetodosPagoAficionadoService,
  ) {}

  @Post()
  create(@Body() dto: CreateMetodoPagoAficionadoDto) {
    return this.metodosPagoAficionadoService.create(dto);
  }

  @Get()
  findAll() {
    return this.metodosPagoAficionadoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.metodosPagoAficionadoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetodoPagoAficionadoDto,
  ) {
    return this.metodosPagoAficionadoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.metodosPagoAficionadoService.remove(id);
  }
}
