import { IsDateString, IsEnum, IsUUID, Matches } from 'class-validator';
import { EstadoInscripcion } from '../entities/inscripcion.entity';

export class CreateInscripcionDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inscripcion!: string;

  @IsEnum(EstadoInscripcion)
  estado!: EstadoInscripcion;

  @IsUUID()
  equipo_id!: string;

  @IsUUID()
  torneo_id!: string;
}
