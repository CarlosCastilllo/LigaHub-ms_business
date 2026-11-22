import type { Anotacion } from '../anotaciones/entities/anotacion.entity';
import type { Partido } from './entities/partido.entity';

export interface Marcador {
  goles_local: number;
  goles_visitante: number;
}

// HU-GC-07: el marcador se calcula contando las anotaciones (goles) de cada
// equipo. Sin anotaciones cargadas el marcador es 0 - 0.
export function calcularMarcador(
  partido: Pick<Partido, 'equipo_local' | 'equipo_local_id' | 'equipo_visitante' | 'equipo_visitante_id'> & {
    anotaciones?: Anotacion[];
  },
): Marcador {
  const localId = partido.equipo_local?.id ?? partido.equipo_local_id;
  const visitanteId = partido.equipo_visitante?.id ?? partido.equipo_visitante_id;
  let golesLocal = 0;
  let golesVisitante = 0;
  for (const anotacion of partido.anotaciones ?? []) {
    const equipoId = anotacion.equipo?.id ?? anotacion.equipo_id;
    if (equipoId === localId) golesLocal += 1;
    else if (equipoId === visitanteId) golesVisitante += 1;
  }
  return { goles_local: golesLocal, goles_visitante: golesVisitante };
}
