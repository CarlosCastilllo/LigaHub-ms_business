import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FaseFinal, ModalidadFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { EstadoFase, Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { FasesService } from './fases.service';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

describe('FasesService', () => {
  let service: FasesService;
  let repository: jest.Mocked<
    Pick<Repository<Fase>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let torneosRepository: jest.Mocked<Pick<Repository<Torneo>, 'findOne'>>;
  let equiposRepository: jest.Mocked<
    Pick<Repository<Equipo>, 'find' | 'count'>
  >;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    torneosRepository = { findOne: jest.fn() };
    equiposRepository = { find: jest.fn(), count: jest.fn() };
    equiposRepository.count.mockResolvedValue(0);
    equiposRepository.find.mockResolvedValue([]);
    repository.findOne.mockResolvedValue(null);
    service = new FasesService(
      repository as unknown as Repository<Fase>,
      torneosRepository as unknown as Repository<Torneo>,
      equiposRepository as unknown as Repository<Equipo>,
      new FaseMapper(),
    );
  });

  function tournament(): Torneo {
    return Object.assign(new Torneo(), {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nombre: 'Torneo de prueba',
      descripcion: 'Descripción',
      estado: 'PENDIENTE',
      max_equipos: 16,
      deporte_id: '550e8400-e29b-41d4-a716-446655440010',
    });
  }

  function groupsPhase(): Fase {
    return Object.assign(new Fase(), {
      id: '550e8400-e29b-41d4-a716-446655440001',
      numero_orden: 1,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-03-15',
      estado: EstadoFase.PENDIENTE,
      torneo_id: '550e8400-e29b-41d4-a716-446655440000',
      grupos: Object.assign(new FaseGrupos(), {
        id: '550e8400-e29b-41d4-a716-446655440011',
        nombre: 'Grupo A',
        cupo_equipos: 4,
      }),
      final: null,
    });
  }

  function finalPhase(): Fase {
    return Object.assign(new Fase(), {
      id: '550e8400-e29b-41d4-a716-446655440002',
      numero_orden: 2,
      fecha_inicio: '2026-03-16',
      fecha_fin: '2026-03-30',
      estado: EstadoFase.PENDIENTE,
      torneo_id: '550e8400-e29b-41d4-a716-446655440000',
      grupos: null,
      final: Object.assign(new FaseFinal(), {
        id: '550e8400-e29b-41d4-a716-446655440012',
        numero_partidos: 2,
        modalidad: ModalidadFinal.IDA_Y_VUELTA,
      }),
    });
  }

  it('creates the phase with its 1:1 groups detail and returns its response DTO', async () => {
    const phase = groupsPhase();
    const torneo = tournament();
    torneosRepository.findOne.mockResolvedValue(torneo);
    repository.save.mockResolvedValue(phase);

    const result = await service.create({
      tipo: TipoFase.GRUPOS,
      numero_orden: phase.numero_orden,
      fecha_inicio: phase.fecha_inicio,
      fecha_fin: phase.fecha_fin,
      estado: phase.estado,
      torneo_id: phase.torneo_id,
      nombre: 'Grupo A',
      cupo_equipos: 4,
    });

    expect(torneosRepository.findOne).toHaveBeenCalledWith({
      where: { id: phase.torneo_id },
    });
    const saved = repository.save.mock.calls[0]?.[0] as Fase;
    expect(saved).toBeInstanceOf(Fase);
    expect(saved.torneo).toBe(torneo);
    expect(saved.grupos).toBeInstanceOf(FaseGrupos);
    expect(saved.grupos).toMatchObject({
      nombre: 'Grupo A',
      cupo_equipos: 4,
    });
    expect(saved.final).toBeUndefined();
    expect(result.tipo).toBe('GRUPOS');
    expect(result.fase_grupos_id).toBe(phase.grupos?.id);
    expect(result.torneo_id).toBe(torneo.id);
    expect(result.nombre).toBe('Grupo A');
    expect(result.cupo_equipos).toBe(4);
    expect(result).not.toHaveProperty('numero_partidos');
  });

  it('rejects creation when the referenced tournament does not exist', async () => {
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        tipo: TipoFase.GRUPOS,
        numero_orden: 1,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-15',
        estado: EstadoFase.PENDIENTE,
        torneo_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Grupo A',
        cupo_equipos: 4,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects creation with fields from the other subtype', async () => {
    await expect(
      service.create({
        tipo: TipoFase.GRUPOS,
        numero_orden: 1,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-15',
        estado: EstadoFase.PENDIENTE,
        torneo_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Grupo A',
        cupo_equipos: 4,
        modalidad: ModalidadFinal.PARTIDO_UNICO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(torneosRepository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects creation when the end date is before the start date', async () => {
    await expect(
      service.create({
        tipo: TipoFase.GRUPOS,
        numero_orden: 1,
        fecha_inicio: '2026-03-15',
        fecha_fin: '2026-03-01',
        estado: EstadoFase.PENDIENTE,
        torneo_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Grupo A',
        cupo_equipos: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(torneosRepository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows several phases with the same order in a tournament', async () => {
    torneosRepository.findOne.mockResolvedValue(tournament());
    repository.findOne.mockResolvedValue(groupsPhase());
    repository.save.mockResolvedValue(groupsPhase());

    await expect(
      service.create({
        tipo: TipoFase.GRUPOS,
        numero_orden: 1,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-15',
        estado: EstadoFase.PENDIENTE,
        torneo_id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Grupo B',
        cupo_equipos: 4,
      }),
    ).resolves.toMatchObject({ numero_orden: 1 });
    expect(repository.save).toHaveBeenCalled();
  });

  it('rejects lowering the group capacity below its assigned teams', async () => {
    repository.findOne.mockResolvedValue(groupsPhase());
    equiposRepository.count.mockResolvedValue(3);

    await expect(
      service.update('550e8400-e29b-41d4-a716-446655440001', {
        cupo_equipos: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns 404 when a phase does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects fields belonging to the other subtype', async () => {
    repository.findOne.mockResolvedValue(groupsPhase());

    await expect(
      service.update('550e8400-e29b-41d4-a716-446655440001', {
        modalidad: ModalidadFinal.PARTIDO_UNICO,
      } as UpdateFaseDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks the combined date range on partial updates', async () => {
    repository.findOne.mockResolvedValue(groupsPhase());

    await expect(
      service.update('550e8400-e29b-41d4-a716-446655440001', {
        fecha_inicio: '2026-03-20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reassigns a phase to an existing tournament', async () => {
    const phase = groupsPhase();
    const torneo = Object.assign(tournament(), {
      id: '550e8400-e29b-41d4-a716-446655440099',
    });
    torneosRepository.findOne.mockResolvedValue(torneo);
    repository.findOne.mockResolvedValue(phase);
    repository.save.mockImplementation(async (entity) => entity as Fase);

    const result = await service.update(phase.id, { torneo_id: torneo.id });

    expect(phase.torneo).toBe(torneo);
    expect(result.torneo_id).toBe(torneo.id);
  });

  it('updates and deletes an existing phase', async () => {
    const phase = finalPhase();
    repository.findOne.mockResolvedValue(phase);
    repository.save.mockResolvedValue(phase);
    repository.remove.mockResolvedValue(phase);

    const updated = await service.update(phase.id, {
      modalidad: ModalidadFinal.PARTIDO_UNICO,
    } as UpdateFaseDto);
    const removed = await service.remove(phase.id);

    expect(updated.modalidad).toBe(ModalidadFinal.PARTIDO_UNICO);
    expect(repository.remove).toHaveBeenCalledWith(phase);
    expect(removed.message).toContain('fase número');
    expect(repository.findOne).toHaveBeenLastCalledWith({
      where: { id: phase.id },
      relations: { partidos: true, torneo: true, grupos: true, final: true },
    });
  });

  it('prevents deleting a phase that has matches', async () => {
    const phase = Object.assign(finalPhase(), { partidos: [{}] });
    repository.findOne.mockResolvedValue(phase);

    await expect(service.remove(phase.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('prevents deleting a groups phase that still has teams assigned', async () => {
    const phase = groupsPhase();
    repository.findOne.mockResolvedValue(phase);
    equiposRepository.find.mockResolvedValue([new Equipo()]);

    await expect(service.remove(phase.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(equiposRepository.find).toHaveBeenCalledWith({
      where: { fase_grupos_id: phase.grupos?.id },
    });
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('lists every phase when no type filter is given', async () => {
    repository.find.mockResolvedValue([groupsPhase(), finalPhase()]);

    const result = await service.findAll();

    expect(result.map(({ tipo }) => tipo)).toEqual([
      TipoFase.GRUPOS,
      TipoFase.FINAL,
    ]);
  });

  it('filters phases by the existing 1:1 detail when a type is given', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn<() => Promise<Fase[]>>()
        .mockResolvedValue([finalPhase()]),
    };
    const createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    Object.assign(repository, { createQueryBuilder });

    const result = await service.findAll({ tipo: TipoFase.FINAL });

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'fase.final',
      'final',
    );
    expect(queryBuilder.where).toHaveBeenCalledWith('final.id IS NOT NULL');
    expect(repository.find).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.tipo).toBe(TipoFase.FINAL);
  });
});
