import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
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
  @IsString({ message: 'El nombre del grupo debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del grupo es obligatorio' })
  @MaxLength(100, {
    message: 'El nombre del grupo no puede superar los 100 caracteres',
  })
  nombre?: string;

  @ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
  @IsInt({ message: 'El cupo de equipos debe ser un número entero' })
  @Min(2, { message: 'El grupo debe admitir al menos 2 equipos' })
  cupo_equipos?: number;

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
