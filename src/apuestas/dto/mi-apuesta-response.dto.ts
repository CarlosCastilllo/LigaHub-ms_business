import {
  PartidoResumenDto,
  toPartidoResumen,
} from '../../partidos/dto/partido-resumen.dto';
import { gananciaPotencial } from '../cuotas';
import type {
  Apuesta,
  EstadoApuesta,
  PronosticoApuesta,
} from '../entities/apuesta.entity';

/** Apuesta vista por su dueño; no repite el aficionado (HU-C). */
export class MiApuestaResponseDto {
  id!: string;
  fecha_apuesta!: Date;
  monto!: number;
  pronostico!: PronosticoApuesta;
  cuota!: number;
  ganancia_potencial!: number;
  estado!: EstadoApuesta;
  partido!: PartidoResumenDto;
  metodo_pago_aficionado_id!: string;
  metodo_pago_referencia!: string;
  metodo_pago_nombre!: string | null;
}

export function toMiApuestaResponse(apuesta: Apuesta): MiApuestaResponseDto {
  const metodo = apuesta.metodo_pago_aficionado;
  return {
    id: apuesta.id,
    fecha_apuesta: apuesta.fecha_apuesta,
    monto: apuesta.monto,
    pronostico: apuesta.pronostico,
    cuota: apuesta.cuota,
    ganancia_potencial: gananciaPotencial(apuesta.monto, apuesta.cuota),
    estado: apuesta.estado,
    partido: toPartidoResumen(apuesta.partido),
    metodo_pago_aficionado_id: metodo.id,
    metodo_pago_referencia: metodo.referencia,
    metodo_pago_nombre: metodo.metodo_pago?.nombre ?? null,
  };
}
