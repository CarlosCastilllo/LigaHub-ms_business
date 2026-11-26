import type { PronosticoApuesta } from '../../apuestas/entities/apuesta.entity';
import type { Partido } from '../../partidos/entities/partido.entity';
import {
  PartidoResumenDto,
  toPartidoResumen,
} from '../../partidos/dto/partido-resumen.dto';

export class LocalidadDisponibleDto {
  id!: string;
  nombre!: string;
  precio!: number;
  capacidad!: number;
  /** Plazas que quedan para este partido (nunca negativo). */
  disponibles!: number;
}

/** Partido programado que el aficionado puede elegir (HU-C). */
export class PartidoDisponibleDto extends PartidoResumenDto {
  escenario_id!: string | null;
  escenario_nombre!: string | null;
  /** Vacío si el partido aún no tiene escenario: no se venden boletas. */
  localidades!: LocalidadDisponibleDto[];
  cuotas!: Readonly<Record<PronosticoApuesta, number>>;
}

/**
 * @param vendidas boletas no anuladas por clave `partidoId:localidadId`.
 */
export function toPartidoDisponible(
  partido: Partido,
  vendidas: Map<string, number>,
  cuotas: Readonly<Record<PronosticoApuesta, number>>,
): PartidoDisponibleDto {
  const localidades = [...(partido.escenario?.localidades ?? [])]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((localidad) => ({
      id: localidad.id,
      nombre: localidad.nombre,
      precio: localidad.precio,
      capacidad: localidad.capacidad,
      disponibles: Math.max(
        0,
        localidad.capacidad -
          (vendidas.get(`${partido.id}:${localidad.id}`) ?? 0),
      ),
    }));
  return Object.assign(toPartidoResumen(partido), {
    escenario_id: partido.escenario?.id ?? null,
    escenario_nombre: partido.escenario?.nombre ?? null,
    localidades,
    cuotas,
  });
}
