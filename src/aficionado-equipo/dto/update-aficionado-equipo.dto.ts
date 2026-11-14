import { PartialType } from '@nestjs/mapped-types';
import { CreateAficionadoEquipoDto } from './create-aficionado-equipo.dto';

export class UpdateAficionadoEquipoDto extends PartialType(
  CreateAficionadoEquipoDto,
) {}
