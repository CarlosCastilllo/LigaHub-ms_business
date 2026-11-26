import {
  PartidoResumenDto,
  toPartidoResumen,
} from '../../partidos/dto/partido-resumen.dto';
import type { Boleta, EstadoBoleta } from '../entities/boleta.entity';

/** Boleta vista por su dueño; no repite el aficionado (HU-C). */
export class MiBoletaResponseDto {
  id!: string;
  fecha_compra!: Date;
  precio!: number;
  estado!: EstadoBoleta;
  partido!: PartidoResumenDto;
  escenario_nombre!: string | null;
  localidad_id!: string;
  localidad_nombre!: string;
}

export function toMiBoletaResponse(boleta: Boleta): MiBoletaResponseDto {
  return {
    id: boleta.id,
    fecha_compra: boleta.fecha_compra,
    precio: boleta.precio,
    estado: boleta.estado,
    partido: toPartidoResumen(boleta.partido),
    escenario_nombre: boleta.partido.escenario?.nombre ?? null,
    localidad_id: boleta.localidad.id,
    localidad_nombre: boleta.localidad.nombre,
  };
}
