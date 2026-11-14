import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoDeporteDto } from './create-equipo-deporte.dto';

export class UpdateEquipoDeporteDto extends PartialType(
  CreateEquipoDeporteDto,
) {}
