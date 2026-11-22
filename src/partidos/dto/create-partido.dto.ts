import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoPartido } from '../entities/partido.entity';

export class CreatePartidoDto {
  // ISO 8601 con zona horaria, p. ej. 2026-11-15T19:30:00-05:00
  @IsDateString({}, { message: 'La fecha y hora del partido no es válida' })
  fecha_hora!: string;

  @IsOptional()
  @IsEnum(EstadoPartido, { message: 'El estado del partido no es válido' })
  estado?: EstadoPartido;

  @IsUUID(undefined, { message: 'El equipo local no es válido' })
  equipo_local_id!: string;

  @IsUUID(undefined, { message: 'El equipo visitante no es válido' })
  equipo_visitante_id!: string;

  @IsOptional()
  @IsInt({ message: 'Los goles del equipo local deben ser un número entero' })
  @Min(0, { message: 'Los goles del equipo local no pueden ser negativos' })
  goles_local?: number;

  @IsOptional()
  @IsInt({
    message: 'Los goles del equipo visitante deben ser un número entero',
  })
  @Min(0, { message: 'Los goles del equipo visitante no pueden ser negativos' })
  goles_visitante?: number;

  // Opcional: el escenario se asocia "cuando corresponda". null lo desasigna.
  @IsOptional()
  @IsUUID(undefined, { message: 'El escenario no es válido' })
  escenario_id?: string | null;

  @IsUUID(undefined, { message: 'La fase no es válida' })
  fase_id!: string;
}
