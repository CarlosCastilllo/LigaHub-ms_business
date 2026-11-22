import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAnotacionDto } from './create-anotacion.dto';

// La anotación conserva siempre su partido: solo cambian minuto, descripción
// y jugador.
export class UpdateAnotacionDto extends PartialType(
  OmitType(CreateAnotacionDto, ['partido_id'] as const),
) {}
