import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, Min, ValidateIf } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class UpdateFaseDto extends PartialType(
  OmitType(CreateFaseDto, ['tipo'] as const),
) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  cantidad_grupos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(2)
  equipos_por_grupo?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  numero_partidos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ModalidadFinal)
  modalidad?: ModalidadFinal;
}
