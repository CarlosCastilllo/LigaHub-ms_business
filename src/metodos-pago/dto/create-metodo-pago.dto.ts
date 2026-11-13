import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoMetodoPago } from '../entities/metodo-pago.entity';

export class CreateMetodoPagoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsEnum(TipoMetodoPago)
  tipo!: TipoMetodoPago;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
