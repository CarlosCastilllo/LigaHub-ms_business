export class EquipoAsociadoDto {
  // id de la fila en aficionados_equipos.
  asociacion_id!: string;
  equipo_id!: string;
  nombre!: string;
  activo!: boolean;
}

export class EquipoDisponibleDto {
  id!: string;
  nombre!: string;
}

export class MiAficionadoResponseDto {
  id!: string;
  user_id!: number;
  nombre!: string;
  documento!: string;
  email!: string;
  telefono!: string | null;
  equipos!: EquipoAsociadoDto[];
}
