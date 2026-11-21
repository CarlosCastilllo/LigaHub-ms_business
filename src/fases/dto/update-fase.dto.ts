import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class UpdateFaseDto extends PartialType(
  OmitType(CreateFaseDto, [
    'tipo',
    'nombre',
    'cupo_equipos',
    'numero_partidos',
    'modalidad',
  ] as const),
) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString({ message: 'El nombre del grupo debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del grupo es obligatorio' })
  @MaxLength(100, {
    message: 'El nombre del grupo no puede superar los 100 caracteres',
  })
  nombre?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'El cupo de equipos debe ser un número entero' })
  @Min(2, { message: 'El grupo debe admitir al menos 2 equipos' })
  cupo_equipos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'El número de partidos debe ser un número entero' })
  @Min(1, { message: 'El número de partidos debe ser al menos 1' })
  numero_partidos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ModalidadFinal, {
    message: 'La modalidad de la fase final no es válida',
  })
  modalidad?: ModalidadFinal;
}
