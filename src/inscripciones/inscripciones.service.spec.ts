import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import {
  EstadoInscripcion,
  Inscripcion,
} from './entities/inscripcion.entity';
import { InscripcionesRepository } from './repositories/inscripciones.repository';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionMapper } from './mappers/inscripcion.mapper';

describe('InscripcionesService', () => {
  let service: InscripcionesService;
  let inscripcionesRepository: jest.Mocked<
    Pick<Repository<Inscripcion>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let torneosRepository: jest.Mocked<Pick<Repository<Torneo>, 'findOne'>>;
  let equiposRepository: jest.Mocked<Pick<Repository<Equipo>, 'findOne'>>;
  let reportsRepository: jest.Mocked<
    Pick<InscripcionesRepository, 'countByTorneo'>
  >;

  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const equipoId = '550e8400-e29b-41d4-a716-446655440010';

  function torneo(): Torneo {
    return Object.assign(new Torneo(), { id: torneoId });
  }

  function equipo(): Equipo {
    return Object.assign(new Equipo(), { id: equipoId, nombre: 'Tigres' });
  }

  function inscripcion(): Inscripcion {
    return Object.assign(new Inscripcion(), {
      id: '550e8400-e29b-41d4-a716-446655440001',
      fecha_inscripcion: '2026-03-01',
      estado: EstadoInscripcion.PENDIENTE,
      equipo: equipo(),
      equipo_id: equipoId,
      torneo: torneo(),
      torneo_id: torneoId,
    });
  }

  beforeEach(() => {
    inscripcionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    torneosRepository = { findOne: jest.fn() };
    equiposRepository = { findOne: jest.fn() };
    reportsRepository = { countByTorneo: jest.fn() };
    service = new InscripcionesService(
      inscripcionesRepository as unknown as Repository<Inscripcion>,
      torneosRepository as unknown as Repository<Torneo>,
      equiposRepository as unknown as Repository<Equipo>,
      reportsRepository as InscripcionesRepository,
    );
  });

  it('creates an inscription linked to an existing tournament', async () => {
    const saved = inscripcion();
    torneosRepository.findOne.mockResolvedValue(torneo());
    equiposRepository.findOne.mockResolvedValue(equipo());
    inscripcionesRepository.save.mockResolvedValue(saved);
    const dto: CreateInscripcionDto = {
      fecha_inscripcion: '2026-03-01',
      estado: EstadoInscripcion.PENDIENTE,
      equipo_id: equipoId,
      torneo_id: torneoId,
    };

    await expect(service.create(dto)).resolves.toEqual(
      InscripcionMapper.toResponseDto(saved),
    );
    expect(torneosRepository.findOne).toHaveBeenCalledWith({
      where: { id: torneoId },
    });
    expect(equiposRepository.findOne).toHaveBeenCalledWith({
      where: { id: equipoId },
    });
    expect(inscripcionesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ torneo: expect.objectContaining({ id: torneoId }) }),
    );
  });

  it('rejects creation when the tournament does not exist', async () => {
    torneosRepository.findOne.mockResolvedValue(null);
    equiposRepository.findOne.mockResolvedValue(equipo());

    await expect(
      service.create({
        fecha_inscripcion: '2026-03-01',
        estado: EstadoInscripcion.PENDIENTE,
        equipo_id: equipoId,
        torneo_id: torneoId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(inscripcionesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects creation when the team does not exist', async () => {
    torneosRepository.findOne.mockResolvedValue(torneo());
    equiposRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        fecha_inscripcion: '2026-03-01',
        estado: EstadoInscripcion.PENDIENTE,
        equipo_id: equipoId,
        torneo_id: torneoId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(inscripcionesRepository.save).not.toHaveBeenCalled();
  });

  it('lists inscriptions with the tournament relation loaded', async () => {
    const item = inscripcion();
    inscripcionesRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      InscripcionMapper.toResponseDto(item),
    ]);
    expect(inscripcionesRepository.find).toHaveBeenCalledWith({
      relations: { torneo: true, equipo: true },
    });
  });

  it('reassigns an inscription only to an existing tournament', async () => {
    const item = inscripcion();
    const otherTorneo = Object.assign(new Torneo(), {
      id: '550e8400-e29b-41d4-a716-446655440099',
    });
    inscripcionesRepository.findOne.mockResolvedValue(item);
    torneosRepository.findOne.mockResolvedValue(otherTorneo);
    equiposRepository.findOne.mockResolvedValue(equipo());
    inscripcionesRepository.save.mockImplementation(async (entity) => entity);

    const result = await service.update(item.id, {
      torneo_id: otherTorneo.id,
    });

    expect(item.torneo).toBe(otherTorneo);
    expect(result.torneo_id).toBe(otherTorneo.id);
  });

  it('returns 404 rather than assigning a missing tournament', async () => {
    const item = inscripcion();
    inscripcionesRepository.findOne.mockResolvedValue(item);
    torneosRepository.findOne.mockResolvedValue(null);
    equiposRepository.findOne.mockResolvedValue(equipo());

    await expect(
      service.update(item.id, { torneo_id: torneoId } as UpdateInscripcionDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(inscripcionesRepository.save).not.toHaveBeenCalled();
  });

  it('checks the tournament before running the count report', async () => {
    torneosRepository.findOne.mockResolvedValue(torneo());
    reportsRepository.countByTorneo.mockResolvedValue(2);

    await expect(service.getCountByTorneo(torneoId)).resolves.toEqual({
      torneo_id: torneoId,
      total_inscripciones: 2,
    });
    expect(reportsRepository.countByTorneo).toHaveBeenCalledWith(torneoId);
  });

  it('returns 404 when an inscription does not exist', async () => {
    inscripcionesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('550e8400-e29b-41d4-a716-446655440001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
