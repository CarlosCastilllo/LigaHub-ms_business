import { PartialType } from '@nestjs/mapped-types';
import { CreateHabilidadDto } from './create-habilidad.dto';

export class UpdateHabilidadDto extends PartialType(CreateHabilidadDto) {}
