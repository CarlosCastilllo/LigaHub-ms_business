import { BoletaResponseDto } from '../../boletas/dto/boleta-response.dto';

export class LocalidadResponseDto {
  id!: string;
  nombre!: string;
  capacidad!: number;
  precio!: number;
  escenario_id!: string;
  boletas?: BoletaResponseDto[];
}
