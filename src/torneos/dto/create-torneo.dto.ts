import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoTorneo } from '../entities/torneo.entity';

export class CreateTorneoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsEnum(EstadoTorneo)
  estado!: EstadoTorneo;

  @IsInt()
  @Min(1)
  max_equipos!: number;

  @IsUUID()
  deporte_id!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
