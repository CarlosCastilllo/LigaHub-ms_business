import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { TipoFase } from '../entities/fase.entity';

export class FindFasesQueryDto {
  @IsOptional()
  @IsEnum(TipoFase, { message: 'El tipo de fase debe ser GRUPOS o FINAL' })
  tipo?: TipoFase;

  @IsOptional()
  @IsUUID(undefined, { message: 'El torneo seleccionado no es válido' })
  torneo_id?: string;

  // Los grupos de una misma etapa comparten torneo y numero_orden.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de orden debe ser un número entero' })
  @Min(1, { message: 'El número de orden debe ser al menos 1' })
  numero_orden?: number;
}
