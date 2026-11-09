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
  cantidad_grupos?: number;
  equipos_por_grupo?: number;
  numero_partidos?: number;
  modalidad?: ModalidadFinal;
}
