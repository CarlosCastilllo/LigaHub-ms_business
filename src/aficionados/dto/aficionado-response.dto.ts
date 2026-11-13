import { ApuestaResponseDto } from '../../apuestas/dto/apuesta-response.dto';
import { BoletaResponseDto } from '../../boletas/dto/boleta-response.dto';
import { MetodoPagoAficionadoResponseDto } from '../../metodos-pago-aficionado/dto/metodo-pago-aficionado-response.dto';

export class AficionadoResponseDto {
  id!: string;
  nombre!: string;
  documento!: string;
  email!: string;
  telefono!: string | null;
  boletas?: BoletaResponseDto[];
  apuestas?: ApuestaResponseDto[];
  metodos_pago_aficionado?: MetodoPagoAficionadoResponseDto[];
}
