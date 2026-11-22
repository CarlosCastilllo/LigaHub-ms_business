import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// HU-GC-07: registro de un gol. El equipo se deduce del jugador.
export class CreateAnotacionDto {
  @IsInt({ message: 'El minuto debe ser un número entero' })
  @Min(0, { message: 'El minuto no puede ser negativo' })
  @Max(130, { message: 'El minuto no puede ser mayor a 130' })
  minuto!: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(255, {
    message: 'La descripción no puede superar los 255 caracteres',
  })
  descripcion?: string | null;

  @IsUUID(undefined, { message: 'El partido no es válido' })
  partido_id!: string;

  @IsUUID(undefined, { message: 'El jugador no es válido' })
  jugador_id!: string;
}
