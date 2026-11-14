import { IsUUID } from 'class-validator';

export class CreateHabilidadJugadorDto {
  @IsUUID()
  habilidad_id!: string;

  @IsUUID()
  jugador_id!: string;
}
