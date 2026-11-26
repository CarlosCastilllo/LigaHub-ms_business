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
import { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import { CurrentUserId } from '../common/security/current-user-id';
import { CreateMiMetodoPagoDto } from './dto/create-mi-metodo-pago.dto';
import { toMiResponse } from './dto/mi-metodo-pago-response.dto';
import { UpdateMetodoPagoAficionadoDto } from './dto/update-metodo-pago-aficionado.dto';
import { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';

@Controller('aficionados/me')
export class MisMetodosPagoController {
  constructor(
    private readonly miAficionadoService: MiAficionadoService,
    private readonly metodosPagoService: MetodosPagoAficionadoService,
  ) {}

  @Get('metodos-pago')
  async findMine(@CurrentUserId() userId: number) {
    const { id } = await this.miAficionadoService.resolverAficionado(userId);
    const registros = await this.metodosPagoService.findByAficionado(id);
    return registros.map(toMiResponse);
  }

  @Get('metodos-pago-disponibles')
  findCatalogoActivo() {
    return this.metodosPagoService.findCatalogoActivo();
  }

  @Post('metodos-pago')
  async create(@CurrentUserId() userId: number, @Body() dto: CreateMiMetodoPagoDto) {
    const { id: aficionadoId } =
      await this.miAficionadoService.resolverAficionado(userId);
    const { id } = await this.metodosPagoService.create({
      aficionado_id: aficionadoId,
      metodo_pago_id: dto.metodo_pago_id,
      referencia: dto.referencia,
      predeterminado: dto.predeterminado,
    });
    return toMiResponse(await this.metodosPagoService.findOwned(id, aficionadoId));
  }

  @Patch('metodos-pago/:id')
  async update(
    @CurrentUserId() userId: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetodoPagoAficionadoDto,
  ) {
    const { id: aficionadoId } =
      await this.miAficionadoService.resolverAficionado(userId);
    await this.metodosPagoService.findOwned(id, aficionadoId);
    await this.metodosPagoService.update(id, dto);
    return toMiResponse(await this.metodosPagoService.findOwned(id, aficionadoId));
  }

  @Delete('metodos-pago/:id')
  async remove(@CurrentUserId() userId: number, @Param('id', ParseUUIDPipe) id: string) {
    const { id: aficionadoId } =
      await this.miAficionadoService.resolverAficionado(userId);
    await this.metodosPagoService.findOwned(id, aficionadoId);
    return this.metodosPagoService.remove(id);
  }
}
