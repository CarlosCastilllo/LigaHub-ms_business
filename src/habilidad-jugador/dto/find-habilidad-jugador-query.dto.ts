import { IsOptional, IsUUID } from 'class-validator';

export class FindHabilidadJugadorQueryDto {
  @IsOptional()
  @IsUUID()
  habilidad_id?: string;

  @IsOptional()
  @IsUUID()
  jugador_id?: string;
}
