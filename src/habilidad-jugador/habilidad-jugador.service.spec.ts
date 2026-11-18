import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Habilidad } from '../habilidades/entities/habilidad.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { HabilidadJugador } from './entities/habilidad-jugador.entity';
import { HabilidadJugadorService } from './habilidad-jugador.service';

describe('HabilidadJugadorService', () => {
  let service: HabilidadJugadorService;
  let relacionesRepository: jest.Mocked<
    Pick<Repository<HabilidadJugador>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let habilidadesRepository: jest.Mocked<Pick<Repository<Habilidad>, 'findOne'>>;
  let jugadoresRepository: jest.Mocked<Pick<Repository<Jugador>, 'findOne'>>;
  const relacionId = '550e8400-e29b-41d4-a716-446655440301';
  const habilidadId = '550e8400-e29b-41d4-a716-446655440302';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440303';

  function relacion(): HabilidadJugador {
    return Object.assign(new HabilidadJugador(), {
      id: relacionId,
      habilidad: Object.assign(new Habilidad(), { id: habilidadId }),
      jugador: Object.assign(new Jugador(), { id: jugadorId }),
    });
  }

  beforeEach(() => {
    relacionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    habilidadesRepository = { findOne: jest.fn() };
    jugadoresRepository = { findOne: jest.fn() };
    relacionesRepository.save.mockImplementation(
      async (entity) => entity as HabilidadJugador,
    );
    habilidadesRepository.findOne.mockResolvedValue(
      Object.assign(new Habilidad(), { id: habilidadId }),
    );
    jugadoresRepository.findOne.mockResolvedValue(
      Object.assign(new Jugador(), { id: jugadorId }),
    );
    service = new HabilidadJugadorService(
      relacionesRepository as unknown as Repository<HabilidadJugador>,
      habilidadesRepository as unknown as Repository<Habilidad>,
      jugadoresRepository as unknown as Repository<Jugador>,
    );
  });

  it('creates a habilidad-jugador association', async () => {
    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).resolves.toEqual(
      expect.objectContaining({
        habilidad_id: habilidadId,
        jugador_id: jugadorId,
      }),
    );
  });

  it('rejects duplicate habilidad-jugador associations', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects associations to missing habilidades', async () => {
    habilidadesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects associations to missing jugadores', async () => {
    jugadoresRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('allows assigning a habilidad to an inactive jugador', async () => {
    jugadoresRepository.findOne.mockResolvedValue(
      Object.assign(new Jugador(), { id: jugadorId, activo: false }),
    );

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).resolves.toEqual(expect.objectContaining({ jugador_id: jugadorId }));
  });

  it('returns 409 when a concurrent request wins the unique index', async () => {
    relacionesRepository.save.mockRejectedValue(
      new QueryFailedError(
        'query',
        [],
        Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }),
      ),
    );

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not hide unexpected persistence errors', async () => {
    const failure = new Error('connection lost');
    relacionesRepository.save.mockRejectedValue(failure);

    await expect(
      service.create({ habilidad_id: habilidadId, jugador_id: jugadorId }),
    ).rejects.toBe(failure);
  });

  it('lists every association without filters', async () => {
    relacionesRepository.find.mockResolvedValue([relacion()]);

    await expect(service.findAll()).resolves.toEqual([
      { id: relacionId, habilidad_id: habilidadId, jugador_id: jugadorId },
    ]);
    expect(relacionesRepository.find).toHaveBeenCalledWith({
      where: undefined,
      relations: { habilidad: true, jugador: true },
    });
  });

  it('lists the habilidades of a jugador', async () => {
    relacionesRepository.find.mockResolvedValue([relacion()]);

    await service.findAll({ jugador_id: jugadorId });

    expect(relacionesRepository.find).toHaveBeenCalledWith({
      where: { jugador: { id: jugadorId } },
      relations: { habilidad: true, jugador: true },
    });
  });

  it('lists the jugadores of a habilidad', async () => {
    relacionesRepository.find.mockResolvedValue([relacion()]);

    await service.findAll({ habilidad_id: habilidadId });

    expect(relacionesRepository.find).toHaveBeenCalledWith({
      where: { habilidad: { id: habilidadId } },
      relations: { habilidad: true, jugador: true },
    });
  });

  it('returns 404 when filtering by a missing jugador or habilidad', async () => {
    jugadoresRepository.findOne.mockResolvedValueOnce(null);
    habilidadesRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.findAll({ jugador_id: jugadorId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findAll({ habilidad_id: habilidadId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(relacionesRepository.find).not.toHaveBeenCalled();
  });

  it('updates an existing association', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(
      service.update(relacionId, { jugador_id: jugadorId }),
    ).resolves.toEqual(
      expect.objectContaining({
        habilidad_id: habilidadId,
        jugador_id: jugadorId,
      }),
    );
  });

  it('removes an existing association', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(service.remove(relacionId)).resolves.toEqual({
      message: `HabilidadJugador #${relacionId} deleted successfully`,
    });
    expect(relacionesRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when removing a missing association', async () => {
    relacionesRepository.findOne.mockResolvedValue(null);

    await expect(service.remove(relacionId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(relacionesRepository.remove).not.toHaveBeenCalled();
  });
});
