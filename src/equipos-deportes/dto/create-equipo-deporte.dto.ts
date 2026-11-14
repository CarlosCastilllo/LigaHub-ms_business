import { IsUUID } from 'class-validator';

export class CreateEquipoDeporteDto {
  @IsUUID()
  equipo_id!: string;

  @IsUUID()
  deporte_id!: string;
}
