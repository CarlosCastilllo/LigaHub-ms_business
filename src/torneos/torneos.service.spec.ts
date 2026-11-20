import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EscenarioTorneo } from '../escenarios-torneo/entities/escenario-torneo.entity';
import { Fase } from '../fases/entities/fase.entity';
import { FaseMapper } from '../fases/mappers/fase.mapper';
import { Deporte } from '../deportes/entities/deporte.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
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
  let deportesRepository: jest.Mocked<Pick<Repository<Deporte>, 'findOne'>>;

  beforeEach(() => {
    torneosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    fasesRepository = { find: jest.fn() };
    deportesRepository = { findOne: jest.fn() };
    deportesRepository.findOne.mockResolvedValue(
      Object.assign(new Deporte(), { id: '550e8400-e29b-41d4-a716-446655440010' }),
    );
    service = new TorneosService(
      torneosRepository as unknown as Repository<Torneo>,
      fasesRepository as unknown as Repository<Fase>,
      deportesRepository as unknown as Repository<Deporte>,
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
      activo: true,
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
      activo: true,
      deporte_id: saved.deporte_id,
    });
    expect(torneosRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ activo: true }),
    );
  });

  it('rejects a tournament with an unknown sport', async () => {
    deportesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        nombre: 'Torneo Apertura',
        descripcion: 'Temporada de apertura',
        estado: EstadoTorneo.PENDIENTE,
        max_equipos: 16,
        deporte_id: '550e8400-e29b-41d4-a716-446655440010',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(torneosRepository.save).not.toHaveBeenCalled();
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

  it('deactivates a tournament without touching the other fields', async () => {
    const existing = torneo();
    torneosRepository.findOne.mockResolvedValue(existing);
    torneosRepository.save.mockImplementation(async (entity) => entity as Torneo);

    const updated = await service.update(existing.id, { activo: false });

    expect(updated).toEqual(
      expect.objectContaining({
        activo: false,
        nombre: 'Torneo Apertura',
        estado: EstadoTorneo.PENDIENTE,
        max_equipos: 16,
      }),
    );
  });

  it('loads the tournament dependencies before deleting it', async () => {
    const existing = torneo();
    torneosRepository.findOne.mockResolvedValue(existing);

    await service.remove(existing.id);

    expect(torneosRepository.findOne).toHaveBeenCalledWith({
      where: { id: existing.id },
      relations: {
        fases: { partidos: true },
        inscripciones: true,
        escenarios_torneo: true,
      },
    });
  });

  it.each([
    ['fases', { fases: [new Fase()] }],
    ['inscripciones', { inscripciones: [new Inscripcion()] }],
    ['escenarios', { escenarios_torneo: [new EscenarioTorneo()] }],
  ])(
    'refuses to delete a tournament that has %s',
    async (_dependencia, relaciones) => {
      torneosRepository.findOne.mockResolvedValue(
        Object.assign(torneo(), relaciones),
      );

      await expect(service.remove(torneo().id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(torneosRepository.remove).not.toHaveBeenCalled();
    },
  );

  it('deletes a tournament whose dependency lists are empty', async () => {
    const existing = Object.assign(torneo(), {
      fases: [],
      inscripciones: [],
      escenarios_torneo: [],
    });
    torneosRepository.findOne.mockResolvedValue(existing);

    await service.remove(existing.id);

    expect(torneosRepository.remove).toHaveBeenCalledWith(existing);
  });

  it('returns 404 when deleting an unknown tournament', async () => {
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(service.remove(torneo().id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(torneosRepository.remove).not.toHaveBeenCalled();
  });
});
