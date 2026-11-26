import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Deporte } from './entities/deporte.entity';
import { DeportesService } from './deportes.service';

describe('DeportesService', () => {
  let service: DeportesService;
  let repository: jest.Mocked<
    Pick<Repository<Deporte>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  const deporteId = '550e8400-e29b-41d4-a716-446655440400';
  const parentId = '550e8400-e29b-41d4-a716-446655440401';
  const dto = { nombre: 'Fútbol', descripcion: 'Deporte de equipo' };

  function deporte(id = deporteId): Deporte {
    return Object.assign(new Deporte(), { id, ...dto });
  }

  function driverError(code: string): QueryFailedError {
    return new QueryFailedError(
      'query',
      [],
      Object.assign(new Error(code), { code }),
    );
  }

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    repository.save.mockImplementation(async (entity) => entity as Deporte);
    service = new DeportesService(repository as unknown as Repository<Deporte>);
  });

  it('creates a root sport', async () => {
    await expect(service.create(dto)).resolves.toEqual(
      expect.objectContaining({ ...dto, deporte_padre_id: null }),
    );
  });

  it('creates a sport under an existing parent', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(deporte(parentId));

    await expect(
      service.create({ ...dto, deporte_padre_id: parentId }),
    ).resolves.toEqual(
      expect.objectContaining({ deporte_padre_id: parentId }),
    );
  });

  it('rejects creating a sport with a registered nombre', async () => {
    repository.findOne.mockResolvedValue(deporte());

    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException('Ya existe un deporte llamado "Fútbol"'),
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { nombre: 'Fútbol' },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent request wins the unique index', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockRejectedValue(driverError('ER_DUP_ENTRY'));

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not hide unexpected persistence errors', async () => {
    repository.findOne.mockResolvedValue(null);
    const failure = driverError('ER_LOCK_DEADLOCK');
    repository.save.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
  });

  it('rejects renaming a sport to the nombre of another sport', async () => {
    repository.findOne
      .mockResolvedValueOnce(deporte())
      .mockResolvedValueOnce(
        Object.assign(deporte(parentId), { nombre: 'Baloncesto' }),
      );

    await expect(
      service.update(deporteId, { nombre: 'Baloncesto' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows updating a sport keeping its own nombre', async () => {
    repository.findOne
      .mockResolvedValueOnce(deporte())
      .mockResolvedValueOnce(deporte());

    await expect(
      service.update(deporteId, { nombre: 'Fútbol', descripcion: 'Nueva' }),
    ).resolves.toEqual(
      expect.objectContaining({ nombre: 'Fútbol', descripcion: 'Nueva' }),
    );
  });

  it('rejects a missing parent sport', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ ...dto, deporte_padre_id: parentId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects assigning a sport as its own parent', async () => {
    repository.findOne.mockResolvedValue(deporte());

    await expect(
      service.update(deporteId, { deporte_padre_id: deporteId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects assigning a descendant as the parent', async () => {
    repository.findOne
      .mockResolvedValueOnce(deporte())
      .mockResolvedValueOnce(
        Object.assign(deporte(parentId), { deporte_padre: deporte() }),
      );

    await expect(
      service.update(deporteId, { deporte_padre_id: parentId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('prevents removing a sport with related records', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(deporte(), { torneos: [{}] }),
    );

    await expect(service.remove(deporteId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing sport', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(deporteId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
