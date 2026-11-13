import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoApuesta, PronosticoApuesta } from '../entities/apuesta.entity';

export class CreateApuestaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto!: number;

  @IsEnum(PronosticoApuesta)
  pronostico!: PronosticoApuesta;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  cuota!: number;

  @IsOptional()
  @IsEnum(EstadoApuesta)
  estado?: EstadoApuesta;

  @IsUUID()
  aficionado_id!: string;

  @IsUUID()
  partido_id!: string;

  // Metodo de pago registrado por el mismo aficionado que apuesta.
  @IsUUID()
  metodo_pago_aficionado_id!: string;
}
