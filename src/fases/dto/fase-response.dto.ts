import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class FaseResponseDto {
  id!: string;
  tipo!: TipoFase;
  numero_orden!: number;
  fecha_inicio!: string;
  fecha_fin!: string;
  estado!: EstadoFase;
  torneo_id!: string;
  // Id del detalle 1:1 en fases_grupos; es el valor que usa equipos.fase_grupos_id.
  fase_grupos_id?: string;
  // Id del detalle 1:1 en fases_finales.
  fase_final_id?: string;
  // Datos del grupo (solo fases de tipo GRUPOS).
  nombre?: string;
  cupo_equipos?: number;
  numero_partidos?: number;
  modalidad?: ModalidadFinal;
}
