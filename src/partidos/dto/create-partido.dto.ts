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
  @IsDateString()
  fecha_hora!: string;

  @IsOptional()
  @IsEnum(EstadoPartido)
  estado?: EstadoPartido;

  @IsUUID()
  equipo_local_id!: string;

  @IsUUID()
  equipo_visitante_id!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  goles_local?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goles_visitante?: number;

  @IsUUID()
  escenario_id!: string;
}
