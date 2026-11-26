import type { EstadoPartido, Partido } from '../entities/partido.entity';

/** Datos mínimos de un partido para mostrar al aficionado (HU-C). */
export class PartidoResumenDto {
  id!: string;
  fecha_hora!: Date;
  estado!: EstadoPartido;
  equipo_local_nombre!: string | null;
  equipo_visitante_nombre!: string | null;
}

export function toPartidoResumen(partido: Partido): PartidoResumenDto {
  return {
    id: partido.id,
    fecha_hora: partido.fecha_hora,
    estado: partido.estado,
    equipo_local_nombre: partido.equipo_local?.nombre ?? null,
    equipo_visitante_nombre: partido.equipo_visitante?.nombre ?? null,
  };
}
