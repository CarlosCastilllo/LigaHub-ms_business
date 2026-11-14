import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePosicionEspacialDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @IsInt()
  @Min(0)
  tiempo_segundos!: number;

  @IsOptional()
  @IsUUID()
  jugador_id?: string | null;

  @IsOptional()
  @IsUUID()
  pelota_id?: string | null;
}
