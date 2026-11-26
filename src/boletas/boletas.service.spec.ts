import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Not, Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { CUOTAS_POR_PRONOSTICO } from '../apuestas/cuotas';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { BoletasService } from './boletas.service';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import { Boleta, EstadoBoleta } from './entities/boleta.entity';

type ManagerMock = {
  findOne: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  count: jest.Mock<(...args: unknown[]) => Promise<number>>;
  save: jest.Mock<(entity: unknown) => Promise<unknown>>;
};

describe('BoletasService', () => {
  let service: BoletasService;
  let boletasRepository: jest.Mocked<
    Pick<
      Repository<Boleta>,
      'save' | 'find' | 'findOne' | 'remove' | 'createQueryBuilder'
    >
  > & {
    manager: {
      transaction: jest.Mock<
        (cb: (manager: EntityManager) => Promise<unknown>) => Promise<unknown>
      >;
    };
  };
  let manager: ManagerMock;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'findOne'>
  >;
  let partidosRepository: jest.Mocked<
    Pick<Repository<Partido>, 'findOne' | 'find'>
  >;
  let localidadesRepository: jest.Mocked<
    Pick<Repository<Localidad>, 'findOne'>
  >;

  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';
  const otroEscenarioId = '550e8400-e29b-41d4-a716-446655440011';
  const aficionadoId = '550e8400-e29b-41d4-a716-446655440080';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const localidadId = '550e8400-e29b-41d4-a716-446655440050';
  const boletaId = '550e8400-e29b-41d4-a716-446655440090';

  function escenario(id = escenarioId): Escenario {
    return Object.assign(new Escenario(), { id });
  }

  function aficionado(): Aficionado {
    return Object.assign(new Aficionado(), { id: aficionadoId });
  }

  function partido(
    escenarioDelPartido = escenarioId,
    estado = EstadoPartido.PROGRAMADO,
  ): Partido {
    return Object.assign(new Partido(), {
      id: partidoId,
      estado,
      escenario: escenario(escenarioDelPartido),
    });
  }

  function localidad(
    escenarioDeLaLocalidad = escenarioId,
    id = localidadId,
  ): Localidad {
    return Object.assign(new Localidad(), {
      id,
      nombre: 'Oriental',
      precio: 45000,
      capacidad: 2,
      escenario: escenario(escenarioDeLaLocalidad),
    });
  }

  function boleta(): Boleta {
    return Object.assign(new Boleta(), {
      id: boletaId,
      fecha_compra: new Date('2026-11-10T10:00:00Z'),
      precio: 45000,
      estado: EstadoBoleta.ACTIVA,
      aficionado: aficionado(),
      partido: partido(),
      localidad: localidad(),
    });
  }

  const createDto: CreateBoletaDto = {
    aficionado_id: aficionadoId,
    partido_id: partidoId,
    localidad_id: localidadId,
  };

  beforeEach(() => {
    manager = {
      findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      count: jest.fn<(...args: unknown[]) => Promise<number>>(),
      save: jest.fn<(entity: unknown) => Promise<unknown>>(),
    };
    manager.findOne.mockResolvedValue(localidad());
    manager.count.mockResolvedValue(0);
    manager.save.mockImplementation(async (entity) => entity);
    boletasRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn(async (cb) =>
          cb(manager as unknown as EntityManager),
        ),
      },
    } as unknown as typeof boletasRepository;
    aficionadosRepository = { findOne: jest.fn() };
    partidosRepository = { findOne: jest.fn(), find: jest.fn() };
    localidadesRepository = { findOne: jest.fn() };
    boletasRepository.save.mockImplementation(
      async (entity) => entity as Boleta,
    );
    service = new BoletasService(
      boletasRepository as unknown as Repository<Boleta>,
      aficionadosRepository as unknown as Repository<Aficionado>,
      partidosRepository as unknown as Repository<Partido>,
      localidadesRepository as unknown as Repository<Localidad>,
    );
  });

  it('creates a boleta using the localidad price by default', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(partido());
    localidadesRepository.findOne.mockResolvedValue(localidad());

    const result = await service.create(createDto);

    expect(result).toEqual(
      expect.objectContaining({
        precio: 45000,
        estado: EstadoBoleta.ACTIVA,
        aficionado_id: aficionadoId,
        partido_id: partidoId,
        localidad_id: localidadId,
      }),
    );
  });

  it('keeps an explicit price', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(partido());
    localidadesRepository.findOne.mockResolvedValue(localidad());

    const result = await service.create({
      aficionado_id: aficionadoId,
      partido_id: partidoId,
      localidad_id: localidadId,
      precio: 30000,
    });

    expect(result.precio).toBe(30000);
  });

  it('rejects a localidad from another escenario', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(partido());
    localidadesRepository.findOne.mockResolvedValue(
      localidad(otroEscenarioId),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(boletasRepository.save).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  describe('cupo por partido y localidad (HU-C)', () => {
    beforeEach(() => {
      aficionadosRepository.findOne.mockResolvedValue(aficionado());
      partidosRepository.findOne.mockResolvedValue(partido());
      localidadesRepository.findOne.mockResolvedValue(localidad());
    });

    it('locks the localidad and counts only non-annulled boletas of the partido', async () => {
      await service.create(createDto);

      expect(boletasRepository.manager.transaction).toHaveBeenCalledTimes(1);
      expect(manager.findOne).toHaveBeenCalledWith(Localidad, {
        where: { id: localidadId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.count).toHaveBeenCalledWith(Boleta, {
        where: {
          partido: { id: partidoId },
          localidad: { id: localidadId },
          estado: Not(EstadoBoleta.ANULADA),
        },
      });
      expect(manager.save).toHaveBeenCalledTimes(1);
    });

    it('rejects with 409 when the localidad is sold out for the partido', async () => {
      manager.count.mockResolvedValue(2);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('sells the last seat while one remains', async () => {
      manager.count.mockResolvedValue(1);

      await expect(service.create(createDto)).resolves.toEqual(
        expect.objectContaining({ estado: EstadoBoleta.ACTIVA }),
      );
    });

    it('rejects a partido that is not programado on the fan route', async () => {
      partidosRepository.findOne.mockResolvedValue(
        partido(escenarioId, EstadoPartido.FINALIZADO),
      );

      await expect(
        service.create(createDto, { soloPartidosProgramados: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(boletasRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('keeps admitting finished partidos on the admin route', async () => {
      partidosRepository.findOne.mockResolvedValue(
        partido(escenarioId, EstadoPartido.FINALIZADO),
      );

      await expect(service.create(createDto)).resolves.toBeDefined();
    });

    it('does not consume cupo when a boleta is marked USADA', async () => {
      boletasRepository.findOne.mockResolvedValue(boleta());

      const result = await service.update(boletaId, {
        estado: EstadoBoleta.USADA,
      });

      expect(result.estado).toBe(EstadoBoleta.USADA);
      expect(boletasRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects reactivating an annulled boleta when the localidad is full', async () => {
      boletasRepository.findOne.mockResolvedValue(
        Object.assign(boleta(), { estado: EstadoBoleta.ANULADA }),
      );
      manager.count.mockResolvedValue(2);

      await expect(
        service.update(boletaId, { estado: EstadoBoleta.ACTIVA }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.count).toHaveBeenCalledWith(Boleta, {
        where: expect.objectContaining({ id: Not(boletaId) }),
      });
    });
  });

  it('lists the boletas of one aficionado, newest first', async () => {
    boletasRepository.find.mockResolvedValue([boleta()]);

    await service.findByAficionado(aficionadoId);

    expect(boletasRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { aficionado: { id: aficionadoId } },
        order: { fecha_compra: 'DESC' },
      }),
    );
  });

  it('returns 404 for a boleta of another aficionado', async () => {
    boletasRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOwned(boletaId, 'otro-aficionado'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(boletasRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: boletaId, aficionado: { id: 'otro-aficionado' } },
      }),
    );
  });

  it('lists programmed partidos with the remaining seats and the cuotas', async () => {
    const conLocalidades = Object.assign(partido(), {
      fecha_hora: new Date('2026-12-01T20:00:00Z'),
      equipo_local: Object.assign(new Equipo(), { nombre: 'Tigres' }),
      equipo_visitante: Object.assign(new Equipo(), { nombre: 'Leones' }),
      escenario: Object.assign(escenario(), {
        nombre: 'Estadio',
        localidades: [
          localidad(),
          Object.assign(localidad(escenarioId, 'palco'), {
            nombre: 'Palco',
            capacidad: 10,
          }),
        ],
      }),
    });
    partidosRepository.find.mockResolvedValue([conLocalidades]);
    const query = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
        { partido_id: partidoId, localidad_id: localidadId, vendidas: '2' },
      ]),
    };
    boletasRepository.createQueryBuilder.mockReturnValue(
      query as unknown as ReturnType<Repository<Boleta>['createQueryBuilder']>,
    );

    const [disponible] = await service.partidosDisponibles();

    expect(partidosRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: EstadoPartido.PROGRAMADO } }),
    );
    expect(disponible).toEqual(
      expect.objectContaining({
        equipo_local_nombre: 'Tigres',
        equipo_visitante_nombre: 'Leones',
        escenario_nombre: 'Estadio',
        cuotas: CUOTAS_POR_PRONOSTICO,
      }),
    );
    expect(disponible.localidades).toEqual([
      expect.objectContaining({ nombre: 'Oriental', disponibles: 0 }),
      expect.objectContaining({ nombre: 'Palco', disponibles: 10 }),
    ]);
  });

  it('skips the count query when there are no programmed partidos', async () => {
    partidosRepository.find.mockResolvedValue([]);

    await expect(service.partidosDisponibles()).resolves.toEqual([]);
    expect(boletasRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it.each([
    ['aficionado', () => aficionadosRepository],
    ['partido', () => partidosRepository],
    ['localidad', () => localidadesRepository],
  ])('returns 404 when the %s does not exist', async (_name, repo) => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(partido());
    localidadesRepository.findOne.mockResolvedValue(localidad());
    (repo() as jest.Mocked<Pick<Repository<object>, 'findOne'>>).findOne
      .mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(boletasRepository.save).not.toHaveBeenCalled();
  });

  it('lists boletas with their relations loaded', async () => {
    boletasRepository.find.mockResolvedValue([boleta()]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(boletasRepository.find).toHaveBeenCalledWith({
      relations: {
        aficionado: true,
        partido: { escenario: true },
        localidad: { escenario: true },
      },
    });
  });

  it('updates the state and reassigns to a localidad of the same escenario', async () => {
    const item = boleta();
    const otraLocalidad = localidad(
      escenarioId,
      '550e8400-e29b-41d4-a716-446655440051',
    );
    boletasRepository.findOne.mockResolvedValue(item);
    localidadesRepository.findOne.mockResolvedValue(otraLocalidad);

    const result = await service.update(boletaId, {
      estado: EstadoBoleta.USADA,
      localidad_id: otraLocalidad.id,
    });

    expect(result.estado).toBe(EstadoBoleta.USADA);
    expect(result.localidad_id).toBe(otraLocalidad.id);
  });

  it('rejects an update that moves the boleta to a localidad of another escenario', async () => {
    boletasRepository.findOne.mockResolvedValue(boleta());
    localidadesRepository.findOne.mockResolvedValue(
      localidad(otroEscenarioId),
    );

    await expect(
      service.update(boletaId, { localidad_id: localidadId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(boletasRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing boleta', async () => {
    boletasRepository.findOne.mockResolvedValue(boleta());

    await expect(service.remove(boletaId)).resolves.toEqual({
      message: 'La boleta se eliminó correctamente',
    });
  });

  it('returns 404 when the boleta does not exist', async () => {
    boletasRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(boletaId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
