import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { ApuestasService } from './apuestas.service';
import { CreateApuestaDto } from './dto/create-apuesta.dto';
import {
  Apuesta,
  EstadoApuesta,
  PronosticoApuesta,
} from './entities/apuesta.entity';

describe('ApuestasService', () => {
  let service: ApuestasService;
  let apuestasRepository: jest.Mocked<
    Pick<Repository<Apuesta>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'findOne'>
  >;
  let partidosRepository: jest.Mocked<Pick<Repository<Partido>, 'findOne'>>;
  let mpaRepository: jest.Mocked<
    Pick<Repository<MetodoPagoAficionado>, 'findOne'>
  >;

  const aficionadoId = '550e8400-e29b-41d4-a716-446655440080';
  const otroAficionadoId = '550e8400-e29b-41d4-a716-446655440081';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const apuestaId = '550e8400-e29b-41d4-a716-446655440095';
  const metodoId = '550e8400-e29b-41d4-a716-446655440100';

  function aficionado(id = aficionadoId): Aficionado {
    return Object.assign(new Aficionado(), { id });
  }

  function partido(estado = EstadoPartido.PROGRAMADO): Partido {
    return Object.assign(new Partido(), { id: partidoId, estado });
  }

  function metodo(
    duenoId = aficionadoId,
    estado = EstadoMetodoPagoAficionado.ACTIVO,
    id = metodoId,
  ): MetodoPagoAficionado {
    return Object.assign(new MetodoPagoAficionado(), {
      id,
      referencia: '**** 4242',
      estado,
      aficionado: aficionado(duenoId),
    });
  }

  function apuesta(): Apuesta {
    return Object.assign(new Apuesta(), {
      id: apuestaId,
      fecha_apuesta: new Date('2026-11-10T10:00:00Z'),
      monto: 20000,
      pronostico: PronosticoApuesta.LOCAL,
      cuota: 1.85,
      estado: EstadoApuesta.PENDIENTE,
      aficionado: aficionado(),
      partido: partido(),
      metodo_pago_aficionado: metodo(),
    });
  }

  const createDto: CreateApuestaDto = {
    monto: 20000,
    pronostico: PronosticoApuesta.LOCAL,
    cuota: 1.85,
    aficionado_id: aficionadoId,
    partido_id: partidoId,
    metodo_pago_aficionado_id: metodoId,
  };

  function mockCreacionValida() {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(partido());
    mpaRepository.findOne.mockResolvedValue(metodo());
  }

  beforeEach(() => {
    apuestasRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    aficionadosRepository = { findOne: jest.fn() };
    partidosRepository = { findOne: jest.fn() };
    mpaRepository = { findOne: jest.fn() };
    apuestasRepository.save.mockImplementation(
      async (entity) => entity as Apuesta,
    );
    service = new ApuestasService(
      apuestasRepository as unknown as Repository<Apuesta>,
      aficionadosRepository as unknown as Repository<Aficionado>,
      partidosRepository as unknown as Repository<Partido>,
      mpaRepository as unknown as Repository<MetodoPagoAficionado>,
    );
  });

  it('creates a pending apuesta paid with a metodo of the same aficionado', async () => {
    mockCreacionValida();

    const result = await service.create(createDto);

    expect(result).toEqual(
      expect.objectContaining({
        monto: 20000,
        pronostico: PronosticoApuesta.LOCAL,
        cuota: 1.85,
        estado: EstadoApuesta.PENDIENTE,
        aficionado_id: aficionadoId,
        partido_id: partidoId,
        metodo_pago_aficionado_id: metodoId,
      }),
    );
    expect(mpaRepository.findOne).toHaveBeenCalledWith({
      where: { id: metodoId },
      relations: { aficionado: true },
    });
  });

  it.each([
    EstadoPartido.EN_JUEGO,
    EstadoPartido.FINALIZADO,
    EstadoPartido.CANCELADO,
  ])('rejects an apuesta on a %s partido', async (estado) => {
    mockCreacionValida();
    partidosRepository.findOne.mockResolvedValue(partido(estado));

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(apuestasRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a metodo registered by another aficionado', async () => {
    mockCreacionValida();
    mpaRepository.findOne.mockResolvedValue(metodo(otroAficionadoId));

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(apuestasRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an INACTIVO metodo', async () => {
    mockCreacionValida();
    mpaRepository.findOne.mockResolvedValue(
      metodo(aficionadoId, EstadoMetodoPagoAficionado.INACTIVO),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns 404 when the metodo does not exist', async () => {
    mockCreacionValida();
    mpaRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 when the aficionado does not exist', async () => {
    aficionadosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 when the partido does not exist', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    partidosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists apuestas with their relations loaded', async () => {
    apuestasRepository.find.mockResolvedValue([apuesta()]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(apuestasRepository.find).toHaveBeenCalledWith({
      relations: {
        aficionado: true,
        partido: true,
        metodo_pago_aficionado: { aficionado: true },
      },
    });
  });

  it('settles an apuesta without checking the partido state', async () => {
    const item = apuesta();
    item.partido = partido(EstadoPartido.FINALIZADO);
    apuestasRepository.findOne.mockResolvedValue(item);

    const result = await service.update(apuestaId, {
      estado: EstadoApuesta.GANADA,
    });

    expect(result.estado).toBe(EstadoApuesta.GANADA);
    expect(partidosRepository.findOne).not.toHaveBeenCalled();
  });

  it('changes the metodo to another one of the same aficionado', async () => {
    const otroMetodoId = '550e8400-e29b-41d4-a716-446655440101';
    apuestasRepository.findOne.mockResolvedValue(apuesta());
    mpaRepository.findOne.mockResolvedValue(
      metodo(aficionadoId, EstadoMetodoPagoAficionado.ACTIVO, otroMetodoId),
    );

    const result = await service.update(apuestaId, {
      metodo_pago_aficionado_id: otroMetodoId,
    });

    expect(result.metodo_pago_aficionado_id).toBe(otroMetodoId);
  });

  it('rejects changing the aficionado without a metodo of the new aficionado', async () => {
    apuestasRepository.findOne.mockResolvedValue(apuesta());
    aficionadosRepository.findOne.mockResolvedValue(
      aficionado(otroAficionadoId),
    );

    await expect(
      service.update(apuestaId, { aficionado_id: otroAficionadoId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(apuestasRepository.save).not.toHaveBeenCalled();
  });

  it('rejects moving an apuesta to a partido that is not scheduled', async () => {
    apuestasRepository.findOne.mockResolvedValue(apuesta());
    partidosRepository.findOne.mockResolvedValue(
      partido(EstadoPartido.FINALIZADO),
    );

    await expect(
      service.update(apuestaId, { partido_id: partidoId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(apuestasRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing apuesta', async () => {
    apuestasRepository.findOne.mockResolvedValue(apuesta());

    await expect(service.remove(apuestaId)).resolves.toEqual({
      message: `Apuesta #${apuestaId} deleted successfully`,
    });
  });

  it('returns 404 when the apuesta does not exist', async () => {
    apuestasRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(apuestaId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
