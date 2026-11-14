import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Habilidad } from './entities/habilidad.entity';
import { HabilidadesService } from './habilidades.service';

describe('HabilidadesService', () => {
  let service: HabilidadesService;
  let repository: jest.Mocked<
    Pick<Repository<Habilidad>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  const habilidadId = '550e8400-e29b-41d4-a716-446655440300';
  const dto = { nombre: 'Velocidad', descripcion: 'Desplazamiento rápido' };

  function habilidad(): Habilidad {
    return Object.assign(new Habilidad(), { id: habilidadId, ...dto });
  }

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    repository.save.mockImplementation(async (entity) => entity as Habilidad);
    service = new HabilidadesService(
      repository as unknown as Repository<Habilidad>,
    );
  });

  it('creates a habilidad', async () => {
    await expect(service.create(dto)).resolves.toEqual(
      expect.objectContaining(dto),
    );
  });

  it('updates an existing habilidad', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(
      service.update(habilidadId, { nombre: 'Resistencia' }),
    ).resolves.toEqual(expect.objectContaining({ nombre: 'Resistencia' }));
  });

  it('returns 404 for a missing habilidad', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(habilidadId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents removing a habilidad assigned to jugadores', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(habilidad(), { jugadores_habilidad: [{}] }),
    );

    await expect(service.remove(habilidadId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('removes a habilidad without jugadores', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(service.remove(habilidadId)).resolves.toEqual({
      message: `Habilidad #${habilidadId} deleted successfully`,
    });
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });
});
