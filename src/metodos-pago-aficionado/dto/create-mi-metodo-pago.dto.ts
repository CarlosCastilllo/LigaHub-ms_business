import { OmitType } from '@nestjs/mapped-types';
import { CreateMetodoPagoAficionadoDto } from './create-metodo-pago-aficionado.dto';

export class CreateMiMetodoPagoDto extends OmitType(
  CreateMetodoPagoAficionadoDto,
  ['aficionado_id', 'estado'] as const,
) {}
