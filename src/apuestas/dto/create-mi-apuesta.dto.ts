import { OmitType } from '@nestjs/mapped-types';
import { CreateApuestaDto } from './create-apuesta.dto';

/**
 * Apuesta del aficionado de la sesión (HU-C). El aficionado, la cuota (tabla
 * fija por pronóstico) y el estado (PENDIENTE) los fija el servidor: enviarlos
 * responde 400.
 */
export class CreateMiApuestaDto extends OmitType(CreateApuestaDto, [
  'aficionado_id',
  'cuota',
  'estado',
] as const) {}
