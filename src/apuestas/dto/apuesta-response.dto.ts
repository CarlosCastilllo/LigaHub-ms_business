import { EstadoApuesta, PronosticoApuesta } from '../entities/apuesta.entity';

export class ApuestaResponseDto {
  id!: string;
  fecha_apuesta!: Date;
  monto!: number;
  pronostico!: PronosticoApuesta;
  cuota!: number;
  estado!: EstadoApuesta;
  aficionado_id!: string;
  partido_id!: string;
  metodo_pago_aficionado_id!: string;
}
