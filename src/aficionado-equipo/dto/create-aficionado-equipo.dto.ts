import { IsUUID } from 'class-validator';

export class CreateAficionadoEquipoDto {
  @IsUUID()
  aficionado_id!: string;

  @IsUUID()
  equipo_id!: string;
}
