import {
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class CreateFaseDto {
  @IsEnum(TipoFase)
  tipo!: TipoFase;

  @IsInt()
  @Min(1)
  numero_orden!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_fin!: string;

  @IsEnum(EstadoFase)
  estado!: EstadoFase;

  @IsUUID()
  torneo_id!: string;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
  @IsInt()
  @Min(1)
  cantidad_grupos?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
  @IsInt()
  @Min(2)
  equipos_por_grupo?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.FINAL)
  @IsInt()
  @Min(1)
  numero_partidos?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.FINAL)
  @IsEnum(ModalidadFinal)
  modalidad?: ModalidadFinal;
}
