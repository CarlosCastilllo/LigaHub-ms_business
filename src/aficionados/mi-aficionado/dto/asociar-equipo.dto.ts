import { IsUUID } from 'class-validator';

export class AsociarEquipoDto {
  @IsUUID('all', { message: 'El equipo debe tener un identificador válido' })
  equipo_id!: string;
}
