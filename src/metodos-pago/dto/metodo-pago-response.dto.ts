import { MetodoPagoAficionadoResponseDto } from '../../metodos-pago-aficionado/dto/metodo-pago-aficionado-response.dto';
import { TipoMetodoPago } from '../entities/metodo-pago.entity';

export class MetodoPagoResponseDto {
  id!: string;
  nombre!: string;
  tipo!: TipoMetodoPago;
  activo!: boolean;
  metodos_pago_aficionado?: MetodoPagoAficionadoResponseDto[];
}
