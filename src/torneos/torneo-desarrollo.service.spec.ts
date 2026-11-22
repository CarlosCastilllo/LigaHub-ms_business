import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Anotacion } from '../anotaciones/entities/anotacion.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { FaseFinal, ModalidadFinal } from '../fases/entities/fase-final.entity';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { EstadoFase, Fase, TipoFase } from '../fases/entities/fase.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { EstadoTorneo, Torneo } from './entities/torneo.entity';
import {
  armarLlaves,
  calcularTablaPosiciones,
  TorneoDesarrolloService,
} from './torneo-desarrollo.service';

const TORNEO_ID = '550e8400-e29b-41d4-a716-446655440000';

function equipo(id: string, nombre: string): Equipo {
  return Object.assign(new Equipo(), { id, nombre });
}

const A = equipo('a', 'Águilas');
const B = equipo('b', 'Búhos');
const C = equipo('c', 'Cóndores');

let secuencia = 0;
function gol(equipoGol: Equipo, minuto = 10): Anotacion {
  secuencia += 1;
  return Object.assign(new Anotacion(), {
    id: `gol-${secuencia}`,
    minuto,
    descripcion: null,
    equipo: equipoGol,
    jugador: Object.assign(new Jugador(), { id: `j-${equipoGol.id}`, user_id: 7 }),
  });
}

function partido(
  local: Equipo,
  visitante: Equipo,
  golesLocal: number,
  golesVisitante: number,
  estado = EstadoPartido.FINALIZADO,
  fecha = '2026-03-01T15:00:00Z',
): Partido {
  secuencia += 1;
  return Object.assign(new Partido(), {
    id: `p-${secuencia}`,
    fecha_hora: new Date(fecha),
    estado,
    equipo_local: local,
    equipo_visitante: visitante,
    escenario: null,
    anotaciones: [
      ...Array.from({ length: golesLocal }, () => gol(local)),
      ...Array.from({ length: golesVisitante }, () => gol(visitante)),
    ],
  });
}

describe('TorneoDesarrolloService', () => {
  let torneosRepository: jest.Mocked<Pick<Repository<Torneo>, 'findOne'>>;
  let fasesRepository: jest.Mocked<Pick<Repository<Fase>, 'find'>>;
  let service: TorneoDesarrolloService;

  beforeEach(() => {
    torneosRepository = { findOne: jest.fn() };
    fasesRepository = { find: jest.fn() };
    service = new TorneoDesarrolloService(
      torneosRepository as unknown as Repository<Torneo>,
      fasesRepository as unknown as Repository<Fase>,
    );
  });

  it('lanza 404 si el torneo no existe', async () => {
    torneosRepository.findOne.mockResolvedValue(null);
    await expect(service.findDesarrollo(TORNEO_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(fasesRepository.find).not.toHaveBeenCalled();
  });

  it('arma etapas de grupos y finales solo con las fases del torneo', async () => {
    torneosRepository.findOne.mockResolvedValue(
      Object.assign(new Torneo(), {
        id: TORNEO_ID,
        nombre: 'Apertura',
        descripcion: 'Temporada',
        estado: EstadoTorneo.EN_CURSO,
        max_equipos: 8,
        activo: true,
        deporte: { id: 'd1', nombre: 'Fútbol' },
      }),
    );
    const base = { fecha_inicio: '2026-03-01', fecha_fin: '2026-03-15', estado: EstadoFase.EN_CURSO };
    const grupoA = Object.assign(new Fase(), {
      ...base,
      id: 'f1',
      numero_orden: 1,
      grupos: Object.assign(new FaseGrupos(), { nombre: 'Grupo A', cupo_equipos: 4, equipos: [A, B] }),
      partidos: [partido(A, B, 2, 1), partido(B, A, 0, 0, EstadoPartido.PROGRAMADO)],
    });
    const grupoB = Object.assign(new Fase(), {
      ...base,
      id: 'f2',
      numero_orden: 1,
      grupos: Object.assign(new FaseGrupos(), { nombre: 'Grupo B', cupo_equipos: 4, equipos: [C] }),
      partidos: [],
    });
    const final = Object.assign(new Fase(), {
      ...base,
      id: 'f3',
      numero_orden: 2,
      grupos: null,
      final: Object.assign(new FaseFinal(), { modalidad: ModalidadFinal.PARTIDO_UNICO, numero_partidos: 1 }),
      partidos: [partido(A, C, 3, 1)],
    });
    fasesRepository.find.mockResolvedValue([grupoA, grupoB, final]);

    const result = await service.findDesarrollo(TORNEO_ID);

    expect(fasesRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { torneo: { id: TORNEO_ID } } }),
    );
    expect(result.torneo.deporte_nombre).toBe('Fútbol');
    expect(result.resumen).toEqual({
      total_fases: 3,
      total_partidos: 3,
      partidos_con_resultado: 2,
      partidos_pendientes: 1,
    });
    expect(result.etapas.map((e) => [e.numero_orden, e.tipo])).toEqual([
      [1, TipoFase.GRUPOS],
      [2, TipoFase.FINAL],
    ]);
    expect(result.etapas[0].grupos.map((g) => g.nombre)).toEqual(['Grupo A', 'Grupo B']);
    const partidos = result.etapas[0].grupos[0].partidos;
    expect(partidos.map((p) => p.con_resultado)).toEqual([true, false]);
    expect(partidos[0]).toMatchObject({ goles_local: 2, goles_visitante: 1 });
    expect(partidos[0].anotaciones[0]).toMatchObject({ jugador_user_id: 7, equipo_id: 'a' });
    expect(result.etapas[1].finales[0].llaves[0].ganador_id).toBe('a');
  });
});

describe('calcularTablaPosiciones', () => {
  it('suma solo partidos finalizados y desempata por diferencia de gol', () => {
    const tabla = calcularTablaPosiciones(
      [A, B, C].map(({ id, nombre }) => ({ id, nombre })),
      [
        partido(A, B, 1, 0),
        partido(C, B, 3, 0),
        partido(A, C, 1, 1),
        partido(B, A, 5, 0, EstadoPartido.PROGRAMADO),
      ],
    );

    expect(tabla.map((fila) => [fila.posicion, fila.equipo.id, fila.pts, fila.dg])).toEqual([
      [1, 'c', 4, 3],
      [2, 'a', 4, 1],
      [3, 'b', 0, -4],
    ]);
    expect(tabla[1]).toMatchObject({ pj: 2, pg: 1, pe: 1, pp: 0, gf: 2, gc: 1 });
  });

  it('incluye equipos del grupo sin partidos jugados', () => {
    const tabla = calcularTablaPosiciones([{ id: 'a', nombre: 'Águilas' }], []);
    expect(tabla).toEqual([
      expect.objectContaining({ posicion: 1, pj: 0, pts: 0 }),
    ]);
  });
});

describe('armarLlaves', () => {
  it('agrupa ida y vuelta en una llave y define el ganador por global', () => {
    const llaves = armarLlaves(
      [partido(A, B, 2, 1), partido(B, A, 1, 0, EstadoPartido.FINALIZADO, '2026-03-08T15:00:00Z')],
      ModalidadFinal.IDA_Y_VUELTA,
    );
    expect(llaves).toHaveLength(1);
    expect(llaves[0]).toMatchObject({ goles_a: 2, goles_b: 2, ganador_id: null });
    expect(llaves[0].partidos).toHaveLength(2);
  });

  it('no define ganador mientras falte el partido de vuelta', () => {
    const [llave] = armarLlaves([partido(A, B, 3, 0)], ModalidadFinal.IDA_Y_VUELTA);
    expect(llave.ganador_id).toBeNull();
  });

  it('deja la llave pendiente si el partido no tiene resultado', () => {
    const [llave] = armarLlaves(
      [partido(A, B, 0, 0, EstadoPartido.PROGRAMADO)],
      ModalidadFinal.PARTIDO_UNICO,
    );
    expect(llave).toMatchObject({ ganador_id: null, goles_a: 0, goles_b: 0 });
  });
});
