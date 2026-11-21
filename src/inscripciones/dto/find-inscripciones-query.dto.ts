import { IsOptional, IsUUID } from 'class-validator';

export class FindInscripcionesQueryDto {
  @IsOptional()
  @IsUUID()
  torneo_id?: string;

  @IsOptional()
  @IsUUID()
  equipo_id?: string;
}
