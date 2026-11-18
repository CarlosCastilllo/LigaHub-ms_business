import { ValidateIf } from 'class-validator';
import {
  IsDescripcionHabilidad,
  IsNombreHabilidad,
} from './create-habilidad.dto';

export class UpdateHabilidadDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsNombreHabilidad()
  nombre?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDescripcionHabilidad()
  descripcion?: string;
}
