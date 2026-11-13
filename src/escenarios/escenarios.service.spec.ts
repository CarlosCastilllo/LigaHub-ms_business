import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  EscenarioTorneo,
  EstadoAsignacionEscenario,
} from '../escenarios-torneo/entities/escenario-torneo.entity';
import { Boleta } from '../boletas/entities/boleta.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Escenario } from './entities/escenario.entity';
import { EscenariosService } from './escenarios.service';

describe('EscenariosService', () => {
  let service: EscenariosService;
  let escenariosRepository: jest.Mocked<
    Pick<Repository<Escenario>, 'save' | 'find' | 'findOne' | 'remove'>
  >;

  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';
  const padreId = '550e8400-e29b-41d4-a716-446655440020';
  const hijoId = '550e8400-e29b-41d4-a716-446655440030';
  const nietoId = '550e8400-e29b-41d4-a716-446655440040';
  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const relations = {
    escenario_padre: true,
    sub_escenarios: true,
    localidades: { boletas: true },
    partidos: true,
    escenarios_torneo: { torneo: true, escenario: true },
  };

  function escenario(
    id = escenarioId,
    escenarioPadreId: string | null = null,
  ): Escenario {
    return Object.assign(new Escenario(), {
      id,
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23 # 70-50',
      capacidad: 36000,
      escenario_padre_id: escenarioPadreId,
      sub_escenarios: [],
      escenarios_torneo: [],
    });
  }

  function escenarioConAsignacion(): Escenario {
    const entity = escenario();
    entity.escenarios_torneo = [
      Object.assign(new EscenarioTorneo(), {
        id: '550e8400-e29b-41d4-a716-446655440001',
        fecha_asignacion: '2026-11-08',
        estado: EstadoAsignacionEscenario.ACTIVO,
        escenario: entity,
        torneo: Object.assign(new Torneo(), { id: torneoId }),
      }),
    ];
    return entity;
  }

  // Simula la tabla: findOne devuelve el escenario segun el id del where.
  function mockTabla(...escenarios: Escenario[]) {
    escenariosRepository.findOne.mockImplementation(async (options) => {
      const id = (options as { where: { id: string } }).where.id;
      return escenarios.find((item) => item.id === id) ?? null;
    });
  }

  beforeEach(() => {
    escenariosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    escenariosRepository.save.mockImplementation(
      async (entity) => entity as Escenario,
    );
    service = new EscenariosService(
      escenariosRepository as unknown as Repository<Escenario>,
    );
  });

  it('creates a root escenario', async () => {
    const dto = { nombre: 'Coliseo', direccion: 'Calle 1', capacidad: 500 };
    escenariosRepository.save.mockImplementation(async (entity) =>
      Object.assign(entity as Escenario, { id: escenarioId }),
    );

    await expect(service.create(dto)).resolves.toEqual({
      id: escenarioId,
      ...dto,
      escenario_padre_id: null,
      sub_escenarios: undefined,
      escenarios_torneo: undefined,
    });
    expect(escenariosRepository.findOne).not.toHaveBeenCalled();
  });

  it('creates a sub-escenario under an existing parent', async () => {
    mockTabla(escenario(padreId));

    const result = await service.create({
      nombre: 'Cancha 1',
      direccion: 'Cra 23 # 70-50',
      capacidad: 200,
      escenario_padre_id: padreId,
    });

    expect(result.escenario_padre_id).toBe(padreId);
    expect(escenariosRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        escenario_padre: expect.objectContaining({ id: padreId }),
      }),
    );
  });

  it('rejects creation when the parent does not exist', async () => {
    mockTabla();

    await expect(
      service.create({
        nombre: 'Cancha 1',
        direccion: 'Calle 1',
        capacidad: 200,
        escenario_padre_id: padreId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(escenariosRepository.save).not.toHaveBeenCalled();
  });

  it('returns an escenario with its parent, sub-escenarios and assignments', async () => {
    const entity = escenarioConAsignacion();
    entity.escenario_padre = escenario(padreId);
    entity.sub_escenarios = [escenario(hijoId, escenarioId)];
    escenariosRepository.findOne.mockResolvedValue(entity);

    const result = await service.findOne(escenarioId);

    expect(escenariosRepository.findOne).toHaveBeenCalledWith({
      where: { id: escenarioId },
      relations,
    });
    expect(result.escenario_padre_id).toBe(padreId);
    expect(result.sub_escenarios).toEqual([
      expect.objectContaining({ id: hijoId, escenario_padre_id: escenarioId }),
    ]);
    expect(result.escenarios_torneo).toEqual([
      expect.objectContaining({
        escenario_id: escenarioId,
        torneo_id: torneoId,
      }),
    ]);
  });

  it('returns the localidades of an escenario', async () => {
    const entity = escenario();
    entity.localidades = [
      Object.assign(new Localidad(), {
        id: '550e8400-e29b-41d4-a716-446655440050',
        nombre: 'Oriental',
        capacidad: 8000,
        precio: 45000,
        escenario: entity,
      }),
    ];
    escenariosRepository.findOne.mockResolvedValue(entity);

    const result = await service.findOne(escenarioId);

    expect(result.localidades).toEqual([
      {
        id: '550e8400-e29b-41d4-a716-446655440050',
        nombre: 'Oriental',
        capacidad: 8000,
        precio: 45000,
        escenario_id: escenarioId,
      },
    ]);
  });

  it('removes an escenario that only has localidades (FK CASCADE)', async () => {
    const item = escenario();
    item.localidades = [
      Object.assign(new Localidad(), { id: 'loc', escenario: item }),
    ];
    mockTabla(item);

    await expect(service.remove(escenarioId)).resolves.toBeDefined();
    expect(escenariosRepository.remove).toHaveBeenCalledWith(item);
  });

  function partido(entity: Escenario): Partido {
    return Object.assign(new Partido(), {
      id: '550e8400-e29b-41d4-a716-446655440060',
      fecha_hora: new Date('2026-11-15T19:30:00-05:00'),
      estado: EstadoPartido.PROGRAMADO,
      equipo_local_id: '550e8400-e29b-41d4-a716-446655440071',
      equipo_visitante_id: '550e8400-e29b-41d4-a716-446655440072',
      goles_local: 0,
      goles_visitante: 0,
      escenario: entity,
    });
  }

  it('returns the partidos of an escenario', async () => {
    const entity = escenario();
    entity.partidos = [partido(entity)];
    escenariosRepository.findOne.mockResolvedValue(entity);

    const result = await service.findOne(escenarioId);

    expect(result.partidos).toEqual([
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440060',
        escenario_id: escenarioId,
      }),
    ]);
  });

  it('does not remove an escenario with partidos', async () => {
    const item = escenario();
    item.partidos = [partido(item)];
    mockTabla(item);

    await expect(service.remove(escenarioId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(escenariosRepository.remove).not.toHaveBeenCalled();
  });

  it('does not remove an escenario whose localidades have boletas', async () => {
    const item = escenario();
    item.localidades = [
      Object.assign(new Localidad(), {
        id: 'loc',
        escenario: item,
        boletas: [Object.assign(new Boleta(), { id: 'boleta' })],
      }),
    ];
    mockTabla(item);

    await expect(service.remove(escenarioId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(escenariosRepository.remove).not.toHaveBeenCalled();
  });

  it('lists escenarios with their relations loaded', async () => {
    escenariosRepository.find.mockResolvedValue([escenario()]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(escenariosRepository.find).toHaveBeenCalledWith({ relations });
  });

  it('updates only the provided fields', async () => {
    mockTabla(escenario());

    const result = await service.update(escenarioId, { capacidad: 40000 });

    expect(result.capacidad).toBe(40000);
    expect(result.nombre).toBe('Estadio Palogrande');
  });

  it('reassigns the parent to a valid escenario', async () => {
    const item = escenario();
    const padre = escenario(padreId);
    mockTabla(item, padre);

    const result = await service.update(escenarioId, {
      escenario_padre_id: padreId,
    });

    expect(item.escenario_padre).toBe(padre);
    expect(result.escenario_padre_id).toBe(padreId);
  });

  it('removes the parent when escenario_padre_id is null', async () => {
    const item = escenario(escenarioId, padreId);
    item.escenario_padre = escenario(padreId);
    mockTabla(item);

    const result = await service.update(escenarioId, {
      escenario_padre_id: null,
    });

    expect(item.escenario_padre).toBeNull();
    expect(result.escenario_padre_id).toBeNull();
  });

  it('rejects an escenario as its own parent', async () => {
    mockTabla(escenario());

    await expect(
      service.update(escenarioId, { escenario_padre_id: escenarioId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(escenariosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a descendant as the new parent (cycle)', async () => {
    // escenario -> hijo -> nieto; poner al nieto como padre crearia un ciclo.
    mockTabla(
      escenario(),
      escenario(hijoId, escenarioId),
      escenario(nietoId, hijoId),
    );

    await expect(
      service.update(escenarioId, { escenario_padre_id: nietoId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(escenariosRepository.save).not.toHaveBeenCalled();
  });

  it('removes an escenario without dependents', async () => {
    mockTabla(escenario());

    await expect(service.remove(escenarioId)).resolves.toEqual({
      message: `Escenario #${escenarioId} deleted successfully`,
    });
    expect(escenariosRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('does not remove an escenario with sub-escenarios', async () => {
    const item = escenario();
    item.sub_escenarios = [escenario(hijoId, escenarioId)];
    mockTabla(item);

    await expect(service.remove(escenarioId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(escenariosRepository.remove).not.toHaveBeenCalled();
  });

  it('does not remove an escenario assigned to tournaments', async () => {
    mockTabla(escenarioConAsignacion());

    await expect(service.remove(escenarioId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(escenariosRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 when the escenario does not exist', async () => {
    mockTabla();

    await expect(service.findOne(escenarioId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(escenarioId, { capacidad: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(escenariosRepository.save).not.toHaveBeenCalled();
  });
});
