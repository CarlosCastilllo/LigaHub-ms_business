import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Fase } from '../fases/entities/fase.entity';
import { Equipo } from './entities/equipo.entity';
import { EquiposService } from './equipos.service';

describe('EquiposService', () => {
  let service: EquiposService;
  let repository: jest.Mocked<
    Pick<Repository<Equipo>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let fasesRepository: jest.Mocked<Pick<Repository<Fase>, 'findOne'>>;
  const equipoId = '550e8400-e29b-41d4-a716-446655440220';
  const faseGruposId = '550e8400-e29b-41d4-a716-446655440230';

  function equipo(): Equipo {
    return Object.assign(new Equipo(), {
      id: equipoId,
      nombre: 'Tigres',
      activo: true,
    });
  }

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    fasesRepository = { findOne: jest.fn() };
    repository.save.mockImplementation(async (entity) => entity as Equipo);
    service = new EquiposService(
      repository as unknown as Repository<Equipo>,
      fasesRepository as unknown as Repository<Fase>,
    );
  });

  it('creates a team', async () => {
    await expect(service.create({ nombre: 'Tigres' })).resolves.toEqual({
      id: undefined,
      nombre: 'Tigres',
      fase_grupos_id: null,
      activo: true,
    });
  });

  it('updates a team', async () => {
    repository.findOne.mockResolvedValue(equipo());

    await expect(
      service.update(equipoId, { nombre: 'Leones' }),
    ).resolves.toEqual({
      id: equipoId,
      nombre: 'Leones',
      fase_grupos_id: null,
      activo: true,
    });
  });

  it('creates a team assigned to an existing FaseGrupos', async () => {
    const faseGrupos = Object.assign(new FaseGrupos(), { id: faseGruposId });
    fasesRepository.findOne.mockResolvedValue(faseGrupos);

    await expect(
      service.create({ nombre: 'Tigres', fase_grupos_id: faseGruposId }),
    ).resolves.toEqual({
      id: undefined,
      nombre: 'Tigres',
      fase_grupos_id: faseGruposId,
      activo: true,
    });
  });

  it('rejects assigning a non-group phase to a team', async () => {
    fasesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ nombre: 'Tigres', fase_grupos_id: faseGruposId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('blocks deletion while the team has related records', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(equipo(), { partidos_locales: [{}] }),
    );

    await expect(service.remove(equipoId)).rejects.toThrow(
      new ConflictException(
        `Equipo #${equipoId} has jugadores, inscripciones, partidos, aficionado preferences or deportes; delete or reassign them first, or deactivate it instead`,
      ),
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('blocks deletion while the team has associated sports', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(equipo(), { equipos_deportes: [{}] }),
    );

    await expect(service.remove(equipoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('removes a team without related records', async () => {
    repository.findOne.mockResolvedValue(equipo());

    await expect(service.remove(equipoId)).resolves.toEqual({
      message: `Equipo #${equipoId} deleted successfully`,
    });
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for a missing team', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(equipoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deactivates a team without touching its other fields', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(equipo(), { fase_grupos_id: faseGruposId }),
    );

    await expect(service.update(equipoId, { activo: false })).resolves.toEqual({
      id: equipoId,
      nombre: 'Tigres',
      fase_grupos_id: faseGruposId,
      activo: false,
    });
    expect(fasesRepository.findOne).not.toHaveBeenCalled();
  });

  it('can register a team as inactive', async () => {
    await expect(
      service.create({ nombre: 'Tigres', activo: false }),
    ).resolves.toEqual(expect.objectContaining({ activo: false }));
  });
});
