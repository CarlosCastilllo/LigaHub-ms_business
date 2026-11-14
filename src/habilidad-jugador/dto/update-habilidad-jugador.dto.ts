import { PartialType } from '@nestjs/mapped-types';
import { CreateHabilidadJugadorDto } from './create-habilidad-jugador.dto';

export class UpdateHabilidadJugadorDto extends PartialType(
  CreateHabilidadJugadorDto,
) {}
