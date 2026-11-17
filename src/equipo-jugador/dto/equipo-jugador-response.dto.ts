export class EquipoJugadorResponseDto {
  id!: string;
  fecha_inicio!: string;
  fecha_fin!: string | null;
  activo!: boolean;
  equipo_id!: string;
  jugador_id!: string;
}
