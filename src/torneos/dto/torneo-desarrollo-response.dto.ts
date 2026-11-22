import { EstadoFase, TipoFase } from '../../fases/entities/fase.entity';
import { ModalidadFinal } from '../../fases/entities/fase-final.entity';
import { EstadoPartido } from '../../partidos/entities/partido.entity';
import { EstadoTorneo } from '../entities/torneo.entity';

// HU-GC-08: vista centralizada del desarrollo de un torneo.

export class EquipoResumenDto {
  id!: string;
  nombre!: string;
}

export class AnotacionDesarrolloDto {
  id!: string;
  minuto!: number;
  descripcion!: string | null;
  jugador_id!: string;
  // El nombre del jugador vive en ms-security: el front lo resuelve con este id.
  jugador_user_id!: number | null;
  equipo_id!: string;
}

export class PartidoDesarrolloDto {
  id!: string;
  fecha_hora!: Date;
  estado!: EstadoPartido;
  equipo_local!: EquipoResumenDto;
  equipo_visitante!: EquipoResumenDto;
  escenario_nombre!: string | null;
  goles_local!: number;
  goles_visitante!: number;
  // Un partido tiene resultado registrado cuando esta FINALIZADO.
  con_resultado!: boolean;
  anotaciones!: AnotacionDesarrolloDto[];
}

export class PosicionDto {
  posicion!: number;
  equipo!: EquipoResumenDto;
  pj!: number;
  pg!: number;
  pe!: number;
  pp!: number;
  gf!: number;
  gc!: number;
  dg!: number;
  pts!: number;
}

export class FaseResumenDto {
  id!: string;
  numero_orden!: number;
  fecha_inicio!: string;
  fecha_fin!: string;
  estado!: EstadoFase;
}

export class GrupoDesarrolloDto {
  fase!: FaseResumenDto;
  nombre!: string;
  cupo_equipos!: number | null;
  equipos!: EquipoResumenDto[];
  tabla_posiciones!: PosicionDto[];
  partidos!: PartidoDesarrolloDto[];
}

export class LlaveDto {
  equipo_a!: EquipoResumenDto;
  equipo_b!: EquipoResumenDto;
  // Goles acumulados en los partidos finalizados de la llave.
  goles_a!: number;
  goles_b!: number;
  // null mientras la llave no esta definida (pendiente o empate global).
  ganador_id!: string | null;
  partidos!: PartidoDesarrolloDto[];
}

export class FinalDesarrolloDto {
  fase!: FaseResumenDto;
  modalidad!: ModalidadFinal | null;
  numero_partidos!: number | null;
  llaves!: LlaveDto[];
}

export class EtapaDesarrolloDto {
  numero_orden!: number;
  tipo!: TipoFase;
  grupos!: GrupoDesarrolloDto[];
  finales!: FinalDesarrolloDto[];
}

export class TorneoDesarrolloResponseDto {
  torneo!: {
    id: string;
    nombre: string;
    descripcion: string;
    estado: EstadoTorneo;
    max_equipos: number;
    activo: boolean;
    deporte_id: string;
    deporte_nombre: string | null;
  };
  resumen!: {
    total_fases: number;
    total_partidos: number;
    partidos_con_resultado: number;
    partidos_pendientes: number;
  };
  etapas!: EtapaDesarrolloDto[];
}
