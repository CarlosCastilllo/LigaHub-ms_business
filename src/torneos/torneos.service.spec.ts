import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Fase } from '../fases/entities/fase.entity';
import { FaseMapper } from '../fases/mappers/fase.mapper';
import { Torneo } from './entities/torneo.entity';
import { EstadoTorneo } from './entities/torneo.entity';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { TorneoMapper } from './mappers/torneo.mapper';
import { TorneosService } from './torneos.service';

describe('TorneosService', () => {
  let service: TorneosService;
  let torneosRepository: jest.Mocked<
    Pick<Repository<Torneo>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let fasesRepository: jest.Mocked<Pick<Repository<Fase>, 'find'>>;

  beforeEach(() => {
    torneosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    fasesRepository = { find: jest.fn() };
    service = new TorneosService(
      torneosRepository as unknown as Repository<Torneo>,
      fasesRepository as unknown as Repository<Fase>,
      new TorneoMapper(),
      new FaseMapper(),
    );
  });

  function torneo(): Torneo {
    return Object.assign(new Torneo(), {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nombre: 'Torneo Apertura',
      descripcion: 'Temporada de apertura',
      estado: EstadoTorneo.PENDIENTE,
      max_equipos: 16,
      deporte_id: '550e8400-e29b-41d4-a716-446655440010',
    });
  }

  it('creates and returns a tournament with its generated id', async () => {
    const saved = torneo();
    torneosRepository.save.mockResolvedValue(saved);
    const dto: CreateTorneoDto = {
      nombre: saved.nombre,
      descripcion: saved.descripcion,
      estado: saved.estado,
      max_equipos: saved.max_equipos,
      deporte_id: saved.deporte_id,
    };

    await expect(service.create(dto)).resolves.toEqual({
      id: saved.id,
      nombre: saved.nombre,
      descripcion: saved.descripcion,
      estado: saved.estado,
      max_equipos: saved.max_equipos,
      deporte_id: saved.deporte_id,
    });
  });

  it('returns 404 for an unknown tournament', async () => {
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('550e8400-e29b-41d4-a716-446655440000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only lists phases after confirming that the tournament exists', async () => {
    torneosRepository.findOne.mockResolvedValue(torneo());
    fasesRepository.find.mockResolvedValue([]);

    await expect(service.findFases(torneo().id)).resolves.toEqual([]);
    expect(fasesRepository.find).toHaveBeenCalledWith({
      where: { torneo: { id: torneo().id } },
      relations: { torneo: true },
    });
  });

  it('does not return an empty phase list for an unknown tournament', async () => {
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(service.findFases(torneo().id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fasesRepository.find).not.toHaveBeenCalled();
  });

  it('updates and deletes a tournament', async () => {
    const existing = torneo();
    torneosRepository.findOne.mockResolvedValue(existing);
    torneosRepository.save.mockResolvedValue(existing);
    torneosRepository.remove.mockResolvedValue(existing);

    const updated = await service.update(existing.id, {
      nombre: 'Torneo Clausura',
    });
    const removed = await service.remove(existing.id);

    expect(updated.nombre).toBe('Torneo Clausura');
    expect(torneosRepository.remove).toHaveBeenCalledWith(existing);
    expect(removed.message).toContain(existing.id);
  });
});
