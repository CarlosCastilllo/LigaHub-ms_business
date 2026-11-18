import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Habilidad } from './entities/habilidad.entity';
import { HabilidadesService } from './habilidades.service';

describe('HabilidadesService', () => {
  let service: HabilidadesService;
  let repository: jest.Mocked<
    Pick<Repository<Habilidad>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  const habilidadId = '550e8400-e29b-41d4-a716-446655440300';
  const otraId = '550e8400-e29b-41d4-a716-446655440301';
  const dto = { nombre: 'Velocidad', descripcion: 'Desplazamiento rápido' };

  function habilidad(id = habilidadId): Habilidad {
    return Object.assign(new Habilidad(), { id, ...dto });
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
    repository.save.mockImplementation(async (entity) => entity as Habilidad);
    service = new HabilidadesService(
      repository as unknown as Repository<Habilidad>,
    );
  });

  it('creates a habilidad', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).resolves.toEqual(
      expect.objectContaining(dto),
    );
  });

  it('rejects creating a habilidad with a registered nombre', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
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

  it('lists habilidades ordered by nombre', async () => {
    repository.find.mockResolvedValue([habilidad()]);

    await expect(service.findAll()).resolves.toEqual([
      { id: habilidadId, ...dto },
    ]);
    expect(repository.find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
  });

  it('returns the detail of a habilidad', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(service.findOne(habilidadId)).resolves.toEqual({
      id: habilidadId,
      ...dto,
    });
  });

  it('updates an existing habilidad', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(
      service.update(habilidadId, { nombre: 'Resistencia' }),
    ).resolves.toEqual(expect.objectContaining({ nombre: 'Resistencia' }));
  });

  it('keeps the nombre when only the descripcion changes', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(
      service.update(habilidadId, { descripcion: 'Nueva descripción' }),
    ).resolves.toEqual({
      id: habilidadId,
      nombre: dto.nombre,
      descripcion: 'Nueva descripción',
    });
    expect(repository.findOne).toHaveBeenCalledTimes(1);
  });

  it('allows a habilidad to keep its own nombre', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(
      service.update(habilidadId, { nombre: 'VELOCIDAD' }),
    ).resolves.toEqual(expect.objectContaining({ nombre: 'VELOCIDAD' }));
  });

  it('rejects renaming a habilidad to the nombre of another one', async () => {
    repository.findOne
      .mockResolvedValueOnce(habilidad())
      .mockResolvedValueOnce(habilidad(otraId));

    await expect(
      service.update(habilidadId, { nombre: 'Velocidad' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing habilidad', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(habilidadId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 when updating or removing a missing habilidad', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.update(habilidadId, { nombre: 'Resistencia' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(habilidadId)).rejects.toBeInstanceOf(
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

  it('returns 409 when a jugador is assigned while removing', async () => {
    repository.findOne.mockResolvedValue(habilidad());
    repository.remove.mockRejectedValue(driverError('ER_ROW_IS_REFERENCED_2'));

    await expect(service.remove(habilidadId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('removes a habilidad without jugadores', async () => {
    repository.findOne.mockResolvedValue(habilidad());

    await expect(service.remove(habilidadId)).resolves.toEqual({
      message: `Habilidad #${habilidadId} deleted successfully`,
    });
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });
});
