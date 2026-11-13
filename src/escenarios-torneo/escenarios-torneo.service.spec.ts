import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateEscenarioTorneoDto } from './dto/create-escenario-torneo.dto';
import { UpdateEscenarioTorneoDto } from './dto/update-escenario-torneo.dto';
import {
  EscenarioTorneo,
  EstadoAsignacionEscenario,
} from './entities/escenario-torneo.entity';
import { EscenarioTorneoMapper } from './mappers/escenario-torneo.mapper';
import { EscenariosTorneoRepository } from './repositories/escenarios-torneo.repository';
import { EscenariosTorneoService } from './escenarios-torneo.service';

describe('EscenariosTorneoService', () => {
  let service: EscenariosTorneoService;
  let asignacionesRepository: jest.Mocked<
    Pick<Repository<EscenarioTorneo>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let torneosRepository: jest.Mocked<Pick<Repository<Torneo>, 'findOne'>>;
  let escenariosRepository: jest.Mocked<
    Pick<Repository<Escenario>, 'findOne'>
  >;
  let reportsRepository: jest.Mocked<
    Pick<EscenariosTorneoRepository, 'countByTorneo'>
  >;

  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';

  function torneo(id = torneoId): Torneo {
    return Object.assign(new Torneo(), { id });
  }

  function escenario(id = escenarioId): Escenario {
    return Object.assign(new Escenario(), {
      id,
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23 # 70-50',
      capacidad: 36000,
    });
  }

  function asignacion(): EscenarioTorneo {
    return Object.assign(new EscenarioTorneo(), {
      id: '550e8400-e29b-41d4-a716-446655440001',
      fecha_asignacion: '2026-11-08',
      estado: EstadoAsignacionEscenario.ACTIVO,
      escenario: escenario(),
      escenario_id: escenarioId,
      torneo: torneo(),
      torneo_id: torneoId,
    });
  }

  const createDto: CreateEscenarioTorneoDto = {
    fecha_asignacion: '2026-11-08',
    estado: EstadoAsignacionEscenario.ACTIVO,
    escenario_id: escenarioId,
    torneo_id: torneoId,
  };

  beforeEach(() => {
    asignacionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    torneosRepository = { findOne: jest.fn() };
    escenariosRepository = { findOne: jest.fn() };
    reportsRepository = { countByTorneo: jest.fn() };
    service = new EscenariosTorneoService(
      asignacionesRepository as unknown as Repository<EscenarioTorneo>,
      torneosRepository as unknown as Repository<Torneo>,
      escenariosRepository as unknown as Repository<Escenario>,
      reportsRepository as EscenariosTorneoRepository,
    );
  });

  it('creates an assignment linked to an existing tournament and escenario', async () => {
    const saved = asignacion();
    torneosRepository.findOne.mockResolvedValue(torneo());
    escenariosRepository.findOne.mockResolvedValue(escenario());
    asignacionesRepository.save.mockResolvedValue(saved);

    await expect(service.create(createDto)).resolves.toEqual(
      EscenarioTorneoMapper.toResponseDto(saved),
    );
    expect(torneosRepository.findOne).toHaveBeenCalledWith({
      where: { id: torneoId },
    });
    expect(escenariosRepository.findOne).toHaveBeenCalledWith({
      where: { id: escenarioId },
    });
    expect(asignacionesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        torneo: expect.objectContaining({ id: torneoId }),
        escenario: expect.objectContaining({ id: escenarioId }),
      }),
    );
  });

  it('rejects creation when the tournament does not exist', async () => {
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(asignacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects creation when the escenario does not exist', async () => {
    torneosRepository.findOne.mockResolvedValue(torneo());
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(asignacionesRepository.save).not.toHaveBeenCalled();
  });

  it('lists assignments with both relations loaded', async () => {
    const item = asignacion();
    asignacionesRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      EscenarioTorneoMapper.toResponseDto(item),
    ]);
    expect(asignacionesRepository.find).toHaveBeenCalledWith({
      relations: { torneo: true, escenario: true },
    });
  });

  it('reassigns an assignment only to an existing tournament', async () => {
    const item = asignacion();
    const otherTorneo = torneo('550e8400-e29b-41d4-a716-446655440099');
    asignacionesRepository.findOne.mockResolvedValue(item);
    torneosRepository.findOne.mockResolvedValue(otherTorneo);
    asignacionesRepository.save.mockImplementation(async (entity) => entity);

    const result = await service.update(item.id, {
      torneo_id: otherTorneo.id,
    });

    expect(item.torneo).toBe(otherTorneo);
    expect(result.torneo_id).toBe(otherTorneo.id);
  });

  it('reassigns an assignment only to an existing escenario', async () => {
    const item = asignacion();
    const otherEscenario = escenario('550e8400-e29b-41d4-a716-446655440098');
    asignacionesRepository.findOne.mockResolvedValue(item);
    escenariosRepository.findOne.mockResolvedValue(otherEscenario);
    asignacionesRepository.save.mockImplementation(async (entity) => entity);

    const result = await service.update(item.id, {
      escenario_id: otherEscenario.id,
    });

    expect(item.escenario).toBe(otherEscenario);
    expect(result.escenario_id).toBe(otherEscenario.id);
  });

  it('does not reassign an assignment to a missing tournament', async () => {
    const item = asignacion();
    asignacionesRepository.findOne.mockResolvedValue(item);
    torneosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(item.id, { torneo_id: torneoId } as UpdateEscenarioTorneoDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(asignacionesRepository.save).not.toHaveBeenCalled();
  });

  it('does not reassign an assignment to a missing escenario', async () => {
    const item = asignacion();
    asignacionesRepository.findOne.mockResolvedValue(item);
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(item.id, { escenario_id: escenarioId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(asignacionesRepository.save).not.toHaveBeenCalled();
  });

  it('checks the tournament before running the assignment count report', async () => {
    torneosRepository.findOne.mockResolvedValue(torneo());
    reportsRepository.countByTorneo.mockResolvedValue(2);

    await expect(service.getCountByTorneo(torneoId)).resolves.toEqual({
      torneo_id: torneoId,
      total_escenarios: 2,
    });
    expect(reportsRepository.countByTorneo).toHaveBeenCalledWith(torneoId);
  });

  it('returns 404 when an assignment does not exist', async () => {
    asignacionesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('550e8400-e29b-41d4-a716-446655440001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
