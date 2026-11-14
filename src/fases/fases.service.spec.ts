import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FaseFinal, ModalidadFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { EstadoFase, Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { FasesService } from './fases.service';
import { Torneo } from '../torneos/entities/torneo.entity';

describe('FasesService', () => {
  let service: FasesService;
  let repository: jest.Mocked<
    Pick<Repository<Fase>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let torneosRepository: jest.Mocked<Pick<Repository<Torneo>, 'findOne'>>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    torneosRepository = { findOne: jest.fn() };
    service = new FasesService(
      repository as unknown as Repository<Fase>,
      torneosRepository as unknown as Repository<Torneo>,
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

  function groupsPhase(): FaseGrupos {
    return Object.assign(new FaseGrupos(), {
      id: '550e8400-e29b-41d4-a716-446655440001',
      numero_orden: 1,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-03-15',
      estado: EstadoFase.PENDIENTE,
      torneo_id: '550e8400-e29b-41d4-a716-446655440000',
      cantidad_grupos: 4,
      equipos_por_grupo: 4,
    });
  }

  function finalPhase(): FaseFinal {
    return Object.assign(new FaseFinal(), {
      id: '550e8400-e29b-41d4-a716-446655440002',
      numero_orden: 2,
      fecha_inicio: '2026-03-16',
      fecha_fin: '2026-03-30',
      estado: EstadoFase.PENDIENTE,
      torneo_id: '550e8400-e29b-41d4-a716-446655440000',
      numero_partidos: 2,
      modalidad: ModalidadFinal.IDA_Y_VUELTA,
    });
  }

  it('creates the concrete subtype and returns its response DTO', async () => {
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
      cantidad_grupos: phase.cantidad_grupos,
      equipos_por_grupo: phase.equipos_por_grupo,
    });

    expect(torneosRepository.findOne).toHaveBeenCalledWith({
      where: { id: phase.torneo_id },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ cantidad_grupos: 4, torneo }),
    );
    expect(result.tipo).toBe('GRUPOS');
    expect(result.torneo_id).toBe(torneo.id);
    expect(result.cantidad_grupos).toBe(4);
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
        cantidad_grupos: 4,
        equipos_por_grupo: 4,
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
        cantidad_grupos: 4,
        equipos_por_grupo: 4,
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
        cantidad_grupos: 4,
        equipos_por_grupo: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(torneosRepository.findOne).not.toHaveBeenCalled();
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
    expect(removed.message).toContain(phase.id);
  });

  it('lists every phase when no type filter is given', async () => {
    repository.find.mockResolvedValue([groupsPhase(), finalPhase()]);

    const result = await service.findAll();

    expect(result.map(({ tipo }) => tipo)).toEqual([
      TipoFase.GRUPOS,
      TipoFase.FINAL,
    ]);
  });

  it('filters phases by the discriminator column when a type is given', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn<() => Promise<Fase[]>>().mockResolvedValue([finalPhase()]),
    };
    const createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
    Object.assign(repository, { createQueryBuilder });

    const result = await service.findAll(TipoFase.FINAL);

    expect(queryBuilder.where).toHaveBeenCalledWith('fase.tipo = :tipo', {
      tipo: TipoFase.FINAL,
    });
    expect(repository.find).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.tipo).toBe(TipoFase.FINAL);
  });
});
