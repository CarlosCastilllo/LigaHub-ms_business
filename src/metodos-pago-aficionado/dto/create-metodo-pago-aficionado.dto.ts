import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { EstadoMetodoPagoAficionado } from '../entities/metodo-pago-aficionado.entity';

export class CreateMetodoPagoAficionadoDto {
  // Solo una referencia enmascarada (p. ej. "**** 4242" o "***-***-4567").
  // Se rechazan 5 o mas digitos seguidos para no guardar numeros completos.
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^(?!.*\d{5}).+$/, {
    message:
      'referencia must be masked: no more than 4 consecutive digits (e.g. "**** 4242")',
  })
  referencia!: string;

  @IsOptional()
  @IsBoolean()
  predeterminado?: boolean;

  @IsOptional()
  @IsEnum(EstadoMetodoPagoAficionado)
  estado?: EstadoMetodoPagoAficionado;

  @IsUUID()
  aficionado_id!: string;

  @IsUUID()
  metodo_pago_id!: string;
}
