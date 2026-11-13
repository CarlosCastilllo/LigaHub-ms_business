import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoPelota } from '../entities/pelota.entity';

export class CreatePelotaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  marca!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  modelo!: string;

  @IsInt()
  @Min(3)
  @Max(5)
  talla!: number;

  @IsOptional()
  @IsEnum(EstadoPelota)
  estado?: EstadoPelota;

  // Opcional: ausente = pelota sin partido. En PATCH, null la desasocia.
  @IsOptional()
  @IsUUID()
  partido_id?: string | null;
}
