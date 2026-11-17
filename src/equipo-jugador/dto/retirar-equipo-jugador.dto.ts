import { IsDateString } from 'class-validator';

export class RetirarEquipoJugadorDto {
  @IsDateString({ strict: true })
  fecha_fin!: string;
}
