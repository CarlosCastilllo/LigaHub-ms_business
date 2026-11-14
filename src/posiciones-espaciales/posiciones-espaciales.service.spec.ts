import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Pelota } from '../pelotas/entities/pelota.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { PosicionEspacial } from './entities/posicion-espacial.entity';
import { PosicionesEspacialesService } from './posiciones-espaciales.service';

describe('PosicionesEspacialesService', () => {
  let service: PosicionesEspacialesService;
  let posicionesRepository: jest.Mocked<
    Pick<Repository<PosicionEspacial>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let jugadoresRepository: jest.Mocked<Pick<Repository<Jugador>, 'findOne'>>;
  let pelotasRepository: jest.Mocked<Pick<Repository<Pelota>, 'findOne'>>;

  const jugadorId = '550e8400-e29b-41d4-a716-446655440210';
  const pelotaId = '550e8400-e29b-41d4-a716-446655440211';
  const posicionId = '550e8400-e29b-41d4-a716-446655440212';
  const dto = { x: 23.5, y: 17, tiempo_segundos: 42, jugador_id: jugadorId };

  beforeEach(() => {
    posicionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    jugadoresRepository = { findOne: jest.fn() };
    pelotasRepository = { findOne: jest.fn() };
    posicionesRepository.save.mockImplementation(
      async (entity) => entity as PosicionEspacial,
    );
    jugadoresRepository.findOne.mockResolvedValue(
      Object.assign(new Jugador(), { id: jugadorId }),
    );
    pelotasRepository.findOne.mockResolvedValue(
      Object.assign(new Pelota(), { id: pelotaId }),
    );
    service = new PosicionesEspacialesService(
      posicionesRepository as unknown as Repository<PosicionEspacial>,
      jugadoresRepository as unknown as Repository<Jugador>,
      pelotasRepository as unknown as Repository<Pelota>,
    );
  });

  it('creates a position for one jugador', async () => {
    await expect(service.create(dto)).resolves.toEqual(
      expect.objectContaining({
        x: 23.5,
        y: 17,
        tiempo_segundos: 42,
        jugador_id: jugadorId,
        pelota_id: null,
      }),
    );
    expect(jugadoresRepository.findOne).toHaveBeenCalledWith({
      where: { id: jugadorId },
    });
  });

  it('creates a position for the pelota', async () => {
    const result = await service.create({
      x: 10,
      y: 20,
      tiempo_segundos: 45,
      pelota_id: pelotaId,
    });

    expect(result.pelota_id).toBe(pelotaId);
    expect(result.jugador_id).toBeNull();
  });

  it.each([
    ['neither subject', {}],
    ['both subjects', { jugador_id: jugadorId, pelota_id: pelotaId }],
  ])('rejects a position with %s', async (_label, subject) => {
    await expect(
      service.create({
        x: 10,
        y: 20,
        tiempo_segundos: 45,
        ...subject,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(posicionesRepository.save).not.toHaveBeenCalled();
  });

  it('returns 404 when the referenced jugador does not exist', async () => {
    jugadoresRepository.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(posicionesRepository.save).not.toHaveBeenCalled();
  });

  it('changes the position subject from jugador to pelota', async () => {
    posicionesRepository.findOne.mockResolvedValue(
      Object.assign(new PosicionEspacial(), {
        id: posicionId,
        x: 1,
        y: 2,
        tiempo_segundos: 3,
        jugador: Object.assign(new Jugador(), { id: jugadorId }),
        pelota: null,
      }),
    );

    const result = await service.update(posicionId, {
      jugador_id: null,
      pelota_id: pelotaId,
    });

    expect(result.jugador_id).toBeNull();
    expect(result.pelota_id).toBe(pelotaId);
  });

  it('does not allow clearing the only subject', async () => {
    posicionesRepository.findOne.mockResolvedValue(
      Object.assign(new PosicionEspacial(), {
        id: posicionId,
        jugador: Object.assign(new Jugador(), { id: jugadorId }),
        pelota: null,
      }),
    );

    await expect(
      service.update(posicionId, { jugador_id: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(posicionesRepository.save).not.toHaveBeenCalled();
  });

  it('lists positions with their subject relations loaded', async () => {
    posicionesRepository.find.mockResolvedValue([]);

    await service.findAll();

    expect(posicionesRepository.find).toHaveBeenCalledWith({
      relations: { jugador: true, pelota: true },
    });
  });
});
