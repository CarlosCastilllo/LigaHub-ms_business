import { EstadoBoleta } from '../entities/boleta.entity';

export class BoletaResponseDto {
  id!: string;
  fecha_compra!: Date;
  precio!: number;
  estado!: EstadoBoleta;
  aficionado_id!: string;
  partido_id!: string;
  localidad_id!: string;
}
