export class PosicionEspacialResponseDto {
  id!: string;
  x!: number;
  y!: number;
  tiempo_segundos!: number;
  jugador_id!: string | null;
  pelota_id!: string | null;
}
