import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Jugador } from './entities/jugador.entity';
import { JugadoresService } from './jugadores.service';

describe('JugadoresService', () => {
  let service: JugadoresService;
  let repository: jest.Mocked<
    Pick<Repository<Jugador>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  const jugadorId = '550e8400-e29b-41d4-a716-446655440200';
  const dto = {
    nombres: 'Alex',
    apellidos: 'Morgan',
    fecha_nacimiento: '1989-07-02',
    nacionalidad: 'Estadounidense',
  };

  function jugador(): Jugador {
    return Object.assign(new Jugador(), { id: jugadorId, ...dto });
  }

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    repository.save.mockImplementation(async (entity) => entity as Jugador);
    service = new JugadoresService(
      repository as unknown as Repository<Jugador>,
    );
  });

  it('creates a jugador', async () => {
    await expect(service.create(dto)).resolves.toEqual(
      expect.objectContaining(dto),
    );
  });

  it('updates an existing jugador', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(
      service.update(jugadorId, { nacionalidad: 'Canadiense' }),
    ).resolves.toEqual(expect.objectContaining({ nacionalidad: 'Canadiense' }));
  });

  it('returns 404 for a missing jugador', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(jugadorId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents removing a jugador with dependent records', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), { equipos_jugador: [{}] }),
    );

    await expect(service.remove(jugadorId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('prevents removing a jugador assigned to habilidades', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), { habilidades_jugador: [{}] }),
    );

    await expect(service.remove(jugadorId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('removes a jugador without dependent records', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(service.remove(jugadorId)).resolves.toEqual({
      message: `Jugador #${jugadorId} deleted successfully`,
    });
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });
});
