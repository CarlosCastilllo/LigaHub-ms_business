import { Body, Controller, Get, Post } from '@nestjs/common';
import { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import { CurrentUserId } from '../common/security/current-user-id';
import { ApuestasService } from './apuestas.service';
import { CUOTAS_POR_PRONOSTICO } from './cuotas';
import { CreateMiApuestaDto } from './dto/create-mi-apuesta.dto';
import { toMiApuestaResponse } from './dto/mi-apuesta-response.dto';

/**
 * HU-C: el aficionado de la sesión apuesta con sus propios métodos de pago y
 * consulta sus apuestas. La cuota la fija el servidor; liquidar o anular solo
 * lo hace el administrador deportivo.
 */
@Controller('aficionados/me')
export class MisApuestasController {
  constructor(
    private readonly miAficionadoService: MiAficionadoService,
    private readonly apuestasService: ApuestasService,
  ) {}

  @Get('apuestas')
  async findMine(@CurrentUserId() userId: number) {
    const { id } = await this.miAficionadoService.resolverAficionado(userId);
    const apuestas = await this.apuestasService.findByAficionado(id);
    return apuestas.map(toMiApuestaResponse);
  }

  @Post('apuestas')
  async apostar(
    @CurrentUserId() userId: number,
    @Body() dto: CreateMiApuestaDto,
  ) {
    const { id: aficionadoId } =
      await this.miAficionadoService.resolverAficionado(userId);
    const { id } = await this.apuestasService.create({
      aficionado_id: aficionadoId,
      partido_id: dto.partido_id,
      pronostico: dto.pronostico,
      monto: dto.monto,
      metodo_pago_aficionado_id: dto.metodo_pago_aficionado_id,
      cuota: CUOTAS_POR_PRONOSTICO[dto.pronostico],
    });
    return toMiApuestaResponse(
      await this.apuestasService.findOwned(id, aficionadoId),
    );
  }
}
