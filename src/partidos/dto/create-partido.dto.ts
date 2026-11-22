import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
}from 'class-validator';
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

  // HU-GC-07: el marcador no se envía; se calcula a partir de las anotaciones.

  // Opcional: el escenario se asocia "cuando corresponda". null lo desasigna.
  @IsOptional()
  @IsUUID(undefined, { message: 'El escenario no es válido' })
  escenario_id?: string | null;

  @IsUUID(undefined, { message: 'La fase no es válida' })
  fase_id!: string;
}
