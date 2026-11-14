import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
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
});
