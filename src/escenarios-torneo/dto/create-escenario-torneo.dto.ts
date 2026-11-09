import { IsDateString, IsEnum, IsUUID, Matches } from 'class-validator';
import { EstadoAsignacionEscenario } from '../entities/escenario-torneo.entity';

export class CreateEscenarioTorneoDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_asignacion!: string;

  @IsEnum(EstadoAsignacionEscenario)
  estado!: EstadoAsignacionEscenario;

  @IsUUID()
  escenario_id!: string;

  @IsUUID()
  torneo_id!: string;
}
