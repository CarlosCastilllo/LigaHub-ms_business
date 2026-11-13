import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMetodoPagoAficionadoDto } from './create-metodo-pago-aficionado.dto';

// No se permite cambiar el aficionado ni el metodo de pago de un registro:
// romperia la coherencia con las apuestas que ya se pagaron con el.
export class UpdateMetodoPagoAficionadoDto extends PartialType(
  OmitType(CreateMetodoPagoAficionadoDto, [
    'aficionado_id',
    'metodo_pago_id',
  ] as const),
) {}
