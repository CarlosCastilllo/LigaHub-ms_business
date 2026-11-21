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
  @IsEnum(TipoFase, { message: 'El tipo de fase seleccionado no es válido' })
  tipo!: TipoFase;

  @IsInt({ message: 'El número de orden debe ser un número entero' })
  @Min(1, { message: 'El número de orden debe ser al menos 1' })
  numero_orden!: number;

  @IsDateString(
    { strict: true },
    { message: 'La fecha de inicio debe ser una fecha válida' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de inicio debe tener el formato AAAA-MM-DD',
  })
  fecha_inicio!: string;

  @IsDateString(
    { strict: true },
    { message: 'La fecha de fin debe ser una fecha válida' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de fin debe tener el formato AAAA-MM-DD',
  })
  fecha_fin!: string;

  @IsEnum(EstadoFase, {
    message: 'El estado de la fase seleccionado no es válido',
  })
  estado!: EstadoFase;

  @IsUUID(undefined, { message: 'El torneo seleccionado no es válido' })
  torneo_id!: string;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
  @IsInt({ message: 'La cantidad de grupos debe ser un número entero' })
  @Min(1, { message: 'La cantidad de grupos debe ser al menos 1' })
  cantidad_grupos?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
  @IsInt({ message: 'Los equipos por grupo deben ser un número entero' })
  @Min(2, { message: 'Debe haber al menos 2 equipos por grupo' })
  equipos_por_grupo?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.FINAL)
  @IsInt({ message: 'El número de partidos debe ser un número entero' })
  @Min(1, { message: 'El número de partidos debe ser al menos 1' })
  numero_partidos?: number;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.FINAL)
  @IsEnum(ModalidadFinal, {
    message: 'La modalidad de la fase final no es válida',
  })
  modalidad?: ModalidadFinal;
}
