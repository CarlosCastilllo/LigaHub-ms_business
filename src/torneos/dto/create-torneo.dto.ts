import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoTorneo } from '../entities/torneo.entity';

export class CreateTorneoDto {
  @IsString()
  @IsNotEmpty()
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
}
