import { Body, Controller, Get, Post } from '@nestjs/common';
import { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import { CurrentUserId } from '../common/security/current-user-id';
import { BoletasService } from './boletas.service';
import { CreateMiBoletaDto } from './dto/create-mi-boleta.dto';
import { toMiBoletaResponse } from './dto/mi-boleta-response.dto';

/**
 * HU-C: el aficionado de la sesión compra boletas a su nombre y consulta
 * las suyas. No hay edición ni anulación: solo la hace el administrador.
 */
@Controller('aficionados/me')
export class MisBoletasController {
  constructor(
    private readonly miAficionadoService: MiAficionadoService,
    private readonly boletasService: BoletasService,
  ) {}

  @Get('partidos-disponibles')
  partidosDisponibles() {
    return this.boletasService.partidosDisponibles();
  }

  @Get('boletas')
  async findMine(@CurrentUserId() userId: number) {
    const { id } = await this.miAficionadoService.resolverAficionado(userId);
    const boletas = await this.boletasService.findByAficionado(id);
    return boletas.map(toMiBoletaResponse);
  }

  @Post('boletas')
  async comprar(
    @CurrentUserId() userId: number,
    @Body() dto: CreateMiBoletaDto,
  ) {
    const { id: aficionadoId } =
      await this.miAficionadoService.resolverAficionado(userId);
    const { id } = await this.boletasService.create(
      {
        aficionado_id: aficionadoId,
        partido_id: dto.partido_id,
        localidad_id: dto.localidad_id,
      },
      { soloPartidosProgramados: true },
    );
    return toMiBoletaResponse(
      await this.boletasService.findOwned(id, aficionadoId),
    );
  }
}
