import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEquipoJugadorDto } from './create-equipo-jugador.dto';

// Equipo y jugador son inmutables: cambiarlos reescribiría el historial.
export class UpdateEquipoJugadorDto extends PartialType(
  OmitType(CreateEquipoJugadorDto, ['equipo_id', 'jugador_id'] as const),
) {}
