import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, Min, ValidateIf } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class UpdateFaseDto extends PartialType(
  OmitType(CreateFaseDto, [
    'tipo',
    'cantidad_grupos',
    'equipos_por_grupo',
    'numero_partidos',
    'modalidad',
  ] as const),
) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'La cantidad de grupos debe ser un número entero' })
  @Min(1, { message: 'La cantidad de grupos debe ser al menos 1' })
  cantidad_grupos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'Los equipos por grupo deben ser un número entero' })
  @Min(2, { message: 'Debe haber al menos 2 equipos por grupo' })
  equipos_por_grupo?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'El número de partidos debe ser un número entero' })
  @Min(1, { message: 'El número de partidos debe ser al menos 1' })
  numero_partidos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ModalidadFinal, { message: 'La modalidad de la fase final no es válida' })
  modalidad?: ModalidadFinal;
}
