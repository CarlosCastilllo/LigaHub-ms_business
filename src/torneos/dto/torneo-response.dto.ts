import { EstadoTorneo } from '../entities/torneo.entity';

export class TorneoResponseDto {
  id!: string;
  nombre!: string;
  descripcion!: string;
  estado!: EstadoTorneo;
  max_equipos!: number;
  activo!: boolean;
  deporte_id!: string;
}
