import { EstadoInscripcion } from '../entities/inscripcion.entity';

export class InscripcionResponseDto {
  id!: string;
  fecha_inscripcion!: string;
  estado!: EstadoInscripcion;
  equipo_id!: string;
  torneo_id!: string;
}
