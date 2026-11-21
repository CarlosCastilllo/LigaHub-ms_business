import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Fase } from '../fases/entities/fase.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Equipo } from './entities/equipo.entity';
import { EquiposService } from './equipos.service';

describe('EquiposService', () => {
  let service: EquiposService;
  let repository: jest.Mocked<
    Pick<Repository<Equipo>, 'save' | 'find' | 'findOne' | 'remove' | 'count'>
  >;
  let fasesRepository: jest.Mocked<Pick<Repository<FaseGrupos>, 'findOne'>>;
  let inscripcionesRepository: jest.Mocked<
    Pick<Repository<Inscripcion>, 'findOne'>
  >;
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
      count: jest.fn(),
    };
    fasesRepository = { findOne: jest.fn() };
    inscripcionesRepository = { findOne: jest.fn() };
    repository.count.mockResolvedValue(0);
    repository.save.mockImplementation(async (entity) => entity as Equipo);
    service = new EquiposService(
      repository as unknown as Repository<Equipo>,
      fasesRepository as unknown as Repository<FaseGrupos>,
      inscripcionesRepository as unknown as Repository<Inscripcion>,
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

  function grupo(cupo: number | null = 4): FaseGrupos {
    return Object.assign(new FaseGrupos(), {
      id: faseGruposId,
      nombre: 'Grupo A',
      cupo_equipos: cupo,
      fase: Object.assign(new Fase(), {
        torneo: Object.assign(new Torneo(), { id: 't1', nombre: 'Copa' }),
      }),
    });
  }

  it('assigns a team to a group of a tournament where it is accepted', async () => {
    repository.findOne.mockResolvedValue(equipo());
    fasesRepository.findOne.mockResolvedValue(grupo());
    inscripcionesRepository.findOne.mockResolvedValue(new Inscripcion());
    repository.count.mockResolvedValue(3);

    await expect(
      service.update(equipoId, { fase_grupos_id: faseGruposId }),
    ).resolves.toEqual(
      expect.objectContaining({ fase_grupos_id: faseGruposId }),
    );
  });

  it('rejects assigning a team that is not accepted in the tournament', async () => {
    repository.findOne.mockResolvedValue(equipo());
    fasesRepository.findOne.mockResolvedValue(grupo());
    inscripcionesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(equipoId, { fase_grupos_id: faseGruposId }),
    ).rejects.toThrow(
      'El equipo no tiene una inscripción aceptada en el torneo "Copa"',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects assigning a team to a full group', async () => {
    repository.findOne.mockResolvedValue(equipo());
    fasesRepository.findOne.mockResolvedValue(grupo(4));
    inscripcionesRepository.findOne.mockResolvedValue(new Inscripcion());
    repository.count.mockResolvedValue(4);

    await expect(
      service.update(equipoId, { fase_grupos_id: faseGruposId }),
    ).rejects.toThrow('El grupo "Grupo A" ya completó su cupo de 4 equipos');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('removes a team from its group with null', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(equipo(), { fase_grupos_id: faseGruposId }),
    );

    await expect(
      service.update(equipoId, { fase_grupos_id: null }),
    ).resolves.toEqual(expect.objectContaining({ fase_grupos_id: null }));
    expect(fasesRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects assigning a missing group to a team', async () => {
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
        'El equipo "Tigres" tiene jugadores, inscripciones, partidos, aficionados o deportes asociados. Elimine o reasigne esas relaciones o desactívelo',
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
      message: 'Se eliminó el equipo "Tigres" correctamente',
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
