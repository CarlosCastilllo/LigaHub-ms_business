import { ApuestaResponseDto } from '../../apuestas/dto/apuesta-response.dto';
import { EstadoMetodoPagoAficionado } from '../entities/metodo-pago-aficionado.entity';

export class MetodoPagoAficionadoResponseDto {
  id!: string;
  referencia!: string;
  fecha_registro!: Date;
  predeterminado!: boolean;
  estado!: EstadoMetodoPagoAficionado;
  aficionado_id!: string;
  metodo_pago_id!: string;
  apuestas?: ApuestaResponseDto[];
}
