import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TipoFase } from '../entities/fase.entity';

export class FindFasesQueryDto {
  @IsOptional()
  @IsEnum(TipoFase, { message: 'El tipo de fase debe ser GRUPOS o FINAL' })
  tipo?: TipoFase;

  @IsOptional()
  @IsUUID(undefined, { message: 'El torneo seleccionado no es válido' })
  torneo_id?: string;
}
