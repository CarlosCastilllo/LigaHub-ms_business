import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateEquipoJugadorDto {
  @IsDateString({ strict: true })
  fecha_inicio!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_fin?: string | null;

  @IsUUID()
  equipo_id!: string;

  @IsUUID()
  jugador_id!: string;
}
