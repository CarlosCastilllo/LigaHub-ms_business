import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { Anotacion } from './entities/anotacion.entity';
import { AnotacionMapper } from './mappers/anotacion.mapper';

describe('AnotacionesService', () => {
  let service: AnotacionesService;
  let anotacionesRepository: jest.Mocked<
    Pick<Repository<Anotacion>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let partidosRepository: jest.Mocked<Pick<Repository<Partido>, 'findOne'>>;
  let jugadoresRepository: jest.Mocked<Pick<Repository<Jugador>, 'findOne'>>;

  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const otroPartidoId = '550e8400-e29b-41d4-a716-446655440061';
  const anotacionId = '550e8400-e29b-41d4-a716-446655440120';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440121';

  function partido(
    estado = EstadoPartido.EN_JUEGO,
    id = partidoId,
  ): Partido {
    return Object.assign(new Partido(), { id, estado });
  }

  function anotacion(): Anotacion {
    return Object.assign(new Anotacion(), {
      id: anotacionId,
      minuto: 23,
      descripcion: 'Gol de cabeza tras tiro de esquina',
      partido: partido(),
      partido_id: partidoId,
      jugador: Object.assign(new Jugador(), { id: jugadorId }),
      jugador_id: jugadorId,
    });
  }

  const createDto: CreateAnotacionDto = {
    minuto: 23,
    descripcion: 'Gol de cabeza tras tiro de esquina',
    partido_id: partidoId,
    jugador_id: jugadorId,
  };

  beforeEach(() => {
    anotacionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    partidosRepository = { findOne: jest.fn() };
    jugadoresRepository = { findOne: jest.fn() };
    jugadoresRepository.findOne.mockResolvedValue(
      Object.assign(new Jugador(), { id: jugadorId }),
    );
    anotacionesRepository.save.mockImplementation(
      async (entity) => entity as Anotacion,
    );
    service = new AnotacionesService(
      anotacionesRepository as unknown as Repository<Anotacion>,
      partidosRepository as unknown as Repository<Partido>,
      jugadoresRepository as unknown as Repository<Jugador>,
    );
  });

  it.each([EstadoPartido.EN_JUEGO, EstadoPartido.FINALIZADO])(
    'creates an anotacion on a %s partido',
    async (estado) => {
      partidosRepository.findOne.mockResolvedValue(partido(estado));

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: undefined,
        minuto: 23,
        descripcion: 'Gol de cabeza tras tiro de esquina',
        partido_id: partidoId,
        jugador_id: jugadorId,
      });
    },
  );

  it.each([EstadoPartido.PROGRAMADO, EstadoPartido.CANCELADO])(
    'rejects an anotacion on a %s partido',
    async (estado) => {
      partidosRepository.findOne.mockResolvedValue(partido(estado));

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(anotacionesRepository.save).not.toHaveBeenCalled();
    },
  );

  it('returns 404 when the partido does not exist', async () => {
    partidosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists anotaciones with the partido relation loaded', async () => {
    const item = anotacion();
    anotacionesRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      AnotacionMapper.toResponseDto(item),
    ]);
    expect(anotacionesRepository.find).toHaveBeenCalledWith({
      relations: { partido: true, jugador: true },
    });
  });

  it('updates minuto and descripcion', async () => {
    anotacionesRepository.findOne.mockResolvedValue(anotacion());

    const result = await service.update(anotacionId, {
      minuto: 45,
      descripcion: 'Gol de penal',
    });

    expect(result).toEqual(
      expect.objectContaining({ minuto: 45, descripcion: 'Gol de penal' }),
    );
    expect(partidosRepository.findOne).not.toHaveBeenCalled();
  });

  it('reassigns an anotacion to another partido that is being played', async () => {
    const item = anotacion();
    const otroPartido = partido(EstadoPartido.FINALIZADO, otroPartidoId);
    anotacionesRepository.findOne.mockResolvedValue(item);
    partidosRepository.findOne.mockResolvedValue(otroPartido);

    const result = await service.update(anotacionId, {
      partido_id: otroPartidoId,
    });

    expect(item.partido).toBe(otroPartido);
    expect(result.partido_id).toBe(otroPartidoId);
  });

  it('does not reassign an anotacion to a missing partido', async () => {
    anotacionesRepository.findOne.mockResolvedValue(anotacion());
    partidosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(anotacionId, { partido_id: otroPartidoId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(anotacionesRepository.save).not.toHaveBeenCalled();
  });

  it('does not reassign an anotacion to a scheduled partido', async () => {
    anotacionesRepository.findOne.mockResolvedValue(anotacion());
    partidosRepository.findOne.mockResolvedValue(
      partido(EstadoPartido.PROGRAMADO, otroPartidoId),
    );

    await expect(
      service.update(anotacionId, { partido_id: otroPartidoId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(anotacionesRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing anotacion', async () => {
    anotacionesRepository.findOne.mockResolvedValue(anotacion());

    await expect(service.remove(anotacionId)).resolves.toEqual({
      message: `Anotacion #${anotacionId} deleted successfully`,
    });
    expect(anotacionesRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the anotacion does not exist', async () => {
    anotacionesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(anotacionId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
