import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoJugadorDto } from './create-equipo-jugador.dto';

export class UpdateEquipoJugadorDto extends PartialType(
  CreateEquipoJugadorDto,
) {}
