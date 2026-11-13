import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { EstadoBoleta } from '../entities/boleta.entity';

export class CreateBoletaDto {
  // Si no se envia, se usa el precio de la localidad.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsEnum(EstadoBoleta)
  estado?: EstadoBoleta;

  @IsUUID()
  aficionado_id!: string;

  @IsUUID()
  partido_id!: string;

  @IsUUID()
  localidad_id!: string;
}
