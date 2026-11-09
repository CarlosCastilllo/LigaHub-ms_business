import {
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  Matches,
  Min,
  Validate,
} from 'class-validator';
import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { FechaFinNoAnteriorConstraint } from '../validators/fecha-fin-no-anterior.constraint';

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
  @Validate(FechaFinNoAnteriorConstraint)
  fecha_fin!: string;

  @IsEnum(EstadoFase)
  estado!: EstadoFase;

  @IsUUID()
  torneo_id!: string;
}
