import { EstadoAsignacionEscenario } from '../entities/escenario-torneo.entity';

export class EscenarioTorneoResponseDto {
  id!: string;
  fecha_asignacion!: string;
  estado!: EstadoAsignacionEscenario;
  escenario_id!: string;
  torneo_id!: string;
}
