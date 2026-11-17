import { IsOptional, IsUUID } from 'class-validator';

export class FindEquiposDeportesQueryDto {
  @IsOptional()
  @IsUUID()
  equipo_id?: string;
}
