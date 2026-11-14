import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Deporte } from '../deportes/entities/deporte.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { EquipoDeporte } from './entities/equipo-deporte.entity';
import { EquiposDeportesService } from './equipos-deportes.service';

describe('EquiposDeportesService', () => {
  let service: EquiposDeportesService;
  let relacionesRepository: jest.Mocked<
    Pick<Repository<EquipoDeporte>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let equiposRepository: jest.Mocked<Pick<Repository<Equipo>, 'findOne'>>;
  let deportesRepository: jest.Mocked<Pick<Repository<Deporte>, 'findOne'>>;
  const relacionId = '550e8400-e29b-41d4-a716-446655440410';
  const equipoId = '550e8400-e29b-41d4-a716-446655440411';
  const deporteId = '550e8400-e29b-41d4-a716-446655440412';

  function relacion(): EquipoDeporte {
    return Object.assign(new EquipoDeporte(), {
      id: relacionId,
      equipo: Object.assign(new Equipo(), { id: equipoId }),
      deporte: Object.assign(new Deporte(), { id: deporteId }),
    });
  }

  beforeEach(() => {
    relacionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    equiposRepository = { findOne: jest.fn() };
    deportesRepository = { findOne: jest.fn() };
    relacionesRepository.save.mockImplementation(
      async (entity) => entity as EquipoDeporte,
    );
    equiposRepository.findOne.mockResolvedValue(
      Object.assign(new Equipo(), { id: equipoId }),
    );
    deportesRepository.findOne.mockResolvedValue(
      Object.assign(new Deporte(), { id: deporteId }),
    );
    service = new EquiposDeportesService(
      relacionesRepository as unknown as Repository<EquipoDeporte>,
      equiposRepository as unknown as Repository<Equipo>,
      deportesRepository as unknown as Repository<Deporte>,
    );
  });

  it('creates an equipo-deporte association', async () => {
    await expect(
      service.create({ equipo_id: equipoId, deporte_id: deporteId }),
    ).resolves.toEqual({
      id: undefined,
      equipo_id: equipoId,
      deporte_id: deporteId,
    });
  });

  it('rejects duplicate associations', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(
      service.create({ equipo_id: equipoId, deporte_id: deporteId }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a missing equipo', async () => {
    equiposRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ equipo_id: equipoId, deporte_id: deporteId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a missing deporte', async () => {
    deportesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ equipo_id: equipoId, deporte_id: deporteId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and removes an association', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(
      service.update(relacionId, { deporte_id: deporteId }),
    ).resolves.toEqual(expect.objectContaining({ deporte_id: deporteId }));
    await expect(service.remove(relacionId)).resolves.toEqual({
      message: `EquipoDeporte #${relacionId} deleted successfully`,
    });
  });
});
