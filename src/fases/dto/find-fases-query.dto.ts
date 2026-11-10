import { IsEnum, IsOptional } from 'class-validator';
import { TipoFase } from '../entities/fase.entity';

export class FindFasesQueryDto {
  @IsOptional()
  @IsEnum(TipoFase)
  tipo?: TipoFase;
}
