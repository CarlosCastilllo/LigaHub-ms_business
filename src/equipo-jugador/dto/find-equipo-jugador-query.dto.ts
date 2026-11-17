import { IsOptional, IsUUID } from 'class-validator';

export class FindEquipoJugadorQueryDto {
  @IsOptional()
  @IsUUID()
  equipo_id?: string;

  @IsOptional()
  @IsUUID()
  jugador_id?: string;
}
