import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateJugadorDto } from './create-jugador.dto';

export class UpdateJugadorDto extends PartialType(
  OmitType(CreateJugadorDto, ['user_id'] as const),
) {}
