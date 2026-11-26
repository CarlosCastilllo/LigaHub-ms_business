import type { TipoMetodoPago } from '../../metodos-pago/entities/metodo-pago.entity';
import type {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from '../entities/metodo-pago-aficionado.entity';

export class MiMetodoPagoResponseDto {
  id!: string;
  referencia!: string;
  fecha_registro!: Date;
  predeterminado!: boolean;
  estado!: EstadoMetodoPagoAficionado;
  metodo_pago_id!: string;
  metodo_pago_nombre!: string;
  metodo_pago_tipo!: TipoMetodoPago;
  tiene_apuestas!: boolean;
}

export function toMiResponse(registro: MetodoPagoAficionado): MiMetodoPagoResponseDto {
  return {
    id: registro.id,
    referencia: registro.referencia,
    fecha_registro: registro.fecha_registro,
    predeterminado: registro.predeterminado,
    estado: registro.estado,
    metodo_pago_id: registro.metodo_pago.id,
    metodo_pago_nombre: registro.metodo_pago.nombre,
    metodo_pago_tipo: registro.metodo_pago.tipo,
    tiene_apuestas: Boolean(registro.apuestas?.length),
  };
}
