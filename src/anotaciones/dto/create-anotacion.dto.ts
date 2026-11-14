import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAnotacionDto {
  @IsInt()
  @Min(0)
  @Max(130)
  minuto!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descripcion!: string;

  @IsUUID()
  partido_id!: string;

  @IsUUID()
  jugador_id!: string;
}
