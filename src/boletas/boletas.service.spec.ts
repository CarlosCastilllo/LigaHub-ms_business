import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { Partido } from '../partidos/entities/partido.entity';
import { BoletasService } from './boletas.service';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import { Boleta, EstadoBoleta } from './entities/boleta.entity';

describe('BoletasService', () => {
  let service: BoletasService;
  let boletasRepository: jest.Mocked<
    Pick<Repository<Boleta>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'findOne'>
  >;
  let partidosRepository: jest.Mocked<Pick<Repository<Partido>, 'findOne'>>;
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

  function partido(escenarioDelPartido = escenarioId): Partido {
    return Object.assign(new Partido(), {
      id: partidoId,
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
    boletasRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    aficionadosRepository = { findOne: jest.fn() };
    partidosRepository = { findOne: jest.fn() };
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
      message: `Boleta #${boletaId} deleted successfully`,
    });
  });

  it('returns 404 when the boleta does not exist', async () => {
    boletasRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(boletaId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
