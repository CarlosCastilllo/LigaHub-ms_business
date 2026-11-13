import { EstadoPelota } from '../entities/pelota.entity';

export class PelotaResponseDto {
  id!: string;
  marca!: string;
  modelo!: string;
  talla!: number;
  estado!: EstadoPelota;
  partido_id!: string | null;
}
