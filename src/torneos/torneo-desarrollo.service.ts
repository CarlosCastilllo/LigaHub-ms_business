import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Equipo } from '../equipos/entities/equipo.entity';
import { ModalidadFinal } from '../fases/entities/fase-final.entity';
import { Fase, TipoFase } from '../fases/entities/fase.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { calcularMarcador } from '../partidos/marcador';
import {
  EquipoResumenDto,
  EtapaDesarrolloDto,
  FaseResumenDto,
  FinalDesarrolloDto,
  GrupoDesarrolloDto,
  LlaveDto,
  PartidoDesarrolloDto,
  PosicionDto,
  TorneoDesarrolloResponseDto,
} from './dto/torneo-desarrollo-response.dto';
import { Torneo } from './entities/torneo.entity';

const PUNTOS_VICTORIA = 3;
const PUNTOS_EMPATE = 1;

/**
 * HU-GC-08: arma en una sola respuesta la estructura y el desarrollo de un
 * torneo (fases, grupos con tabla de posiciones, llaves de fases finales,
 * partidos con su estado de resultado y anotaciones).
 */
@Injectable()
export class TorneoDesarrolloService {
  constructor(
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
  ) {}

  async findDesarrollo(id: string): Promise<TorneoDesarrolloResponseDto> {
    const torneo = await this.torneosRepository.findOne({
      where: { id },
      relations: { deporte: true },
    });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }

    // Solo las fases de este torneo: todo lo demas cuelga de ellas.
    const fases = await this.fasesRepository.find({
      where: { torneo: { id } },
      relations: {
        grupos: { equipos: true },
        final: true,
        partidos: {
          equipo_local: true,
          equipo_visitante: true,
          escenario: true,
          anotaciones: { jugador: true, equipo: true },
        },
      },
      order: { numero_orden: 'ASC', fecha_inicio: 'ASC' },
    });

    const etapas = this.agruparEtapas(fases);
    const partidos = fases.flatMap((fase) => fase.partidos ?? []);
    const conResultado = partidos.filter(tieneResultado).length;

    return {
      torneo: {
        id: torneo.id,
        nombre: torneo.nombre,
        descripcion: torneo.descripcion,
        estado: torneo.estado,
        max_equipos: torneo.max_equipos,
        activo: torneo.activo,
        deporte_id: torneo.deporte?.id ?? torneo.deporte_id,
        deporte_nombre: torneo.deporte?.nombre ?? null,
      },
      resumen: {
        total_fases: fases.length,
        total_partidos: partidos.length,
        partidos_con_resultado: conResultado,
        partidos_pendientes: partidos.length - conResultado,
      },
      etapas,
    };
  }

  // Varias fases (grupos) pueden compartir numero_orden: forman una etapa.
  private agruparEtapas(fases: Fase[]): EtapaDesarrolloDto[] {
    const etapas = new Map<string, EtapaDesarrolloDto>();
    for (const fase of fases) {
      const tipo = fase.grupos ? TipoFase.GRUPOS : TipoFase.FINAL;
      const clave = `${fase.numero_orden}-${tipo}`;
      let etapa = etapas.get(clave);
      if (!etapa) {
        etapa = { numero_orden: fase.numero_orden, tipo, grupos: [], finales: [] };
        etapas.set(clave, etapa);
      }
      if (fase.grupos) etapa.grupos.push(this.toGrupo(fase));
      else etapa.finales.push(this.toFinal(fase));
    }
    return [...etapas.values()].sort((a, b) => a.numero_orden - b.numero_orden);
  }

  private toGrupo(fase: Fase): GrupoDesarrolloDto {
    const grupo = fase.grupos!;
    const partidos = ordenarPorFecha(fase.partidos ?? []);
    const equipos = [...(grupo.equipos ?? [])]
      .map(toEquipo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return {
      fase: toFase(fase),
      nombre: grupo.nombre,
      cupo_equipos: grupo.cupo_equipos,
      equipos,
      tabla_posiciones: calcularTablaPosiciones(equipos, partidos),
      partidos: partidos.map(toPartido),
    };
  }

  private toFinal(fase: Fase): FinalDesarrolloDto {
    const modalidad = fase.final?.modalidad ?? null;
    return {
      fase: toFase(fase),
      modalidad,
      numero_partidos: fase.final?.numero_partidos ?? null,
      llaves: armarLlaves(ordenarPorFecha(fase.partidos ?? []), modalidad),
    };
  }
}

function tieneResultado(partido: Partido): boolean {
  return partido.estado === EstadoPartido.FINALIZADO;
}

function ordenarPorFecha(partidos: Partido[]): Partido[] {
  return [...partidos].sort(
    (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
  );
}

function toEquipo(equipo: Pick<Equipo, 'id' | 'nombre'>): EquipoResumenDto {
  return { id: equipo.id, nombre: equipo.nombre };
}

function toFase(fase: Fase): FaseResumenDto {
  return {
    id: fase.id,
    numero_orden: fase.numero_orden,
    fecha_inicio: fase.fecha_inicio,
    fecha_fin: fase.fecha_fin,
    estado: fase.estado,
  };
}

function toPartido(partido: Partido): PartidoDesarrolloDto {
  const marcador = calcularMarcador(partido);
  return {
    id: partido.id,
    fecha_hora: partido.fecha_hora,
    estado: partido.estado,
    equipo_local: toEquipo(partido.equipo_local),
    equipo_visitante: toEquipo(partido.equipo_visitante),
    escenario_nombre: partido.escenario?.nombre ?? null,
    goles_local: marcador.goles_local,
    goles_visitante: marcador.goles_visitante,
    con_resultado: tieneResultado(partido),
    anotaciones: [...(partido.anotaciones ?? [])]
      .sort((a, b) => a.minuto - b.minuto)
      .map((anotacion) => ({
        id: anotacion.id,
        minuto: anotacion.minuto,
        descripcion: anotacion.descripcion,
        jugador_id: anotacion.jugador?.id ?? anotacion.jugador_id,
        jugador_user_id: anotacion.jugador?.user_id ?? null,
        equipo_id: anotacion.equipo?.id ?? anotacion.equipo_id,
      })),
  };
}

/**
 * Tabla de posiciones de un grupo: solo cuentan los partidos FINALIZADOS.
 * Victoria 3, empate 1, derrota 0. Desempate: puntos, diferencia de gol,
 * goles a favor y nombre.
 */
export function calcularTablaPosiciones(
  equipos: EquipoResumenDto[],
  partidos: Partido[],
): PosicionDto[] {
  const filas = new Map<string, PosicionDto>();
  const fila = (equipo: EquipoResumenDto): PosicionDto => {
    let actual = filas.get(equipo.id);
    if (!actual) {
      actual = {
        posicion: 0,
        equipo,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      };
      filas.set(equipo.id, actual);
    }
    return actual;
  };
  equipos.forEach(fila);

  for (const partido of partidos.filter(tieneResultado)) {
    const { goles_local, goles_visitante } = calcularMarcador(partido);
    sumar(fila(toEquipo(partido.equipo_local)), goles_local, goles_visitante);
    sumar(fila(toEquipo(partido.equipo_visitante)), goles_visitante, goles_local);
  }

  return [...filas.values()]
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.dg - a.dg ||
        b.gf - a.gf ||
        a.equipo.nombre.localeCompare(b.equipo.nombre),
    )
    .map((item, index) => ({ ...item, posicion: index + 1 }));
}

function sumar(fila: PosicionDto, favor: number, contra: number): void {
  fila.pj += 1;
  fila.gf += favor;
  fila.gc += contra;
  fila.dg = fila.gf - fila.gc;
  if (favor > contra) {
    fila.pg += 1;
    fila.pts += PUNTOS_VICTORIA;
  } else if (favor === contra) {
    fila.pe += 1;
    fila.pts += PUNTOS_EMPATE;
  } else {
    fila.pp += 1;
  }
}

/**
 * Llaves de una fase final: los partidos se agrupan por pareja de equipos
 * (ida y vuelta quedan en la misma llave). Hay ganador cuando se jugaron los
 * partidos que exige la modalidad y el global no esta empatado.
 */
export function armarLlaves(
  partidos: Partido[],
  modalidad: ModalidadFinal | null,
): LlaveDto[] {
  const requeridos = modalidad === ModalidadFinal.IDA_Y_VUELTA ? 2 : 1;
  const llaves = new Map<string, { a: EquipoResumenDto; b: EquipoResumenDto; partidos: Partido[] }>();

  for (const partido of partidos) {
    const local = toEquipo(partido.equipo_local);
    const visitante = toEquipo(partido.equipo_visitante);
    const clave = [local.id, visitante.id].sort().join('|');
    const llave = llaves.get(clave) ?? { a: local, b: visitante, partidos: [] };
    llave.partidos.push(partido);
    llaves.set(clave, llave);
  }

  return [...llaves.values()].map(({ a, b, partidos: delaLlave }) => {
    let golesA = 0;
    let golesB = 0;
    const jugados = delaLlave.filter(tieneResultado);
    for (const partido of jugados) {
      const marcador = calcularMarcador(partido);
      const aEsLocal = partido.equipo_local.id === a.id;
      golesA += aEsLocal ? marcador.goles_local : marcador.goles_visitante;
      golesB += aEsLocal ? marcador.goles_visitante : marcador.goles_local;
    }
    const pendientes = delaLlave.some(
      (partido) =>
        !tieneResultado(partido) && partido.estado !== EstadoPartido.CANCELADO,
    );
    const definida = !pendientes && jugados.length >= requeridos && golesA !== golesB;
    return {
      equipo_a: a,
      equipo_b: b,
      goles_a: golesA,
      goles_b: golesB,
      ganador_id: definida ? (golesA > golesB ? a.id : b.id) : null,
      partidos: delaLlave.map(toPartido),
    };
  });
}
