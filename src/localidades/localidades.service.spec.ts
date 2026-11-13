import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Boleta } from '../boletas/entities/boleta.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { CreateLocalidadDto } from './dto/create-localidad.dto';
import { Localidad } from './entities/localidad.entity';
import { LocalidadesService } from './localidades.service';
import { LocalidadMapper } from './mappers/localidad.mapper';

describe('LocalidadesService', () => {
  let service: LocalidadesService;
  let localidadesRepository: jest.Mocked<
    Pick<Repository<Localidad>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let escenariosRepository: jest.Mocked<
    Pick<Repository<Escenario>, 'findOne'>
  >;

  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';
  const localidadId = '550e8400-e29b-41d4-a716-446655440050';

  function escenario(id = escenarioId): Escenario {
    return Object.assign(new Escenario(), {
      id,
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23 # 70-50',
      capacidad: 36000,
    });
  }

  function localidad(): Localidad {
    return Object.assign(new Localidad(), {
      id: localidadId,
      nombre: 'Oriental',
      capacidad: 8000,
      precio: 45000,
      escenario: escenario(),
      escenario_id: escenarioId,
    });
  }

  const createDto: CreateLocalidadDto = {
    nombre: 'Oriental',
    capacidad: 8000,
    precio: 45000,
    escenario_id: escenarioId,
  };

  beforeEach(() => {
    localidadesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    escenariosRepository = { findOne: jest.fn() };
    service = new LocalidadesService(
      localidadesRepository as unknown as Repository<Localidad>,
      escenariosRepository as unknown as Repository<Escenario>,
    );
  });

  it('creates a localidad linked to an existing escenario', async () => {
    const saved = localidad();
    escenariosRepository.findOne.mockResolvedValue(escenario());
    localidadesRepository.save.mockResolvedValue(saved);

    await expect(service.create(createDto)).resolves.toEqual(
      LocalidadMapper.toResponseDto(saved),
    );
    expect(escenariosRepository.findOne).toHaveBeenCalledWith({
      where: { id: escenarioId },
    });
    expect(localidadesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Oriental',
        escenario: expect.objectContaining({ id: escenarioId }),
      }),
    );
  });

  it('rejects creation when the escenario does not exist', async () => {
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(localidadesRepository.save).not.toHaveBeenCalled();
  });

  it('lists localidades with the escenario relation loaded', async () => {
    const item = localidad();
    localidadesRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      LocalidadMapper.toResponseDto(item),
    ]);
    expect(localidadesRepository.find).toHaveBeenCalledWith({
      relations: { escenario: true, boletas: true },
    });
  });

  it('updates fields and reassigns to an existing escenario', async () => {
    const item = localidad();
    const otroEscenario = escenario('550e8400-e29b-41d4-a716-446655440099');
    localidadesRepository.findOne.mockResolvedValue(item);
    escenariosRepository.findOne.mockResolvedValue(otroEscenario);
    localidadesRepository.save.mockImplementation(
      async (entity) => entity as Localidad,
    );

    const result = await service.update(localidadId, {
      precio: 50000,
      escenario_id: otroEscenario.id,
    });

    expect(item.escenario).toBe(otroEscenario);
    expect(result.escenario_id).toBe(otroEscenario.id);
    expect(result.precio).toBe(50000);
    expect(result.nombre).toBe('Oriental');
  });

  it('does not reassign a localidad to a missing escenario', async () => {
    localidadesRepository.findOne.mockResolvedValue(localidad());
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(localidadId, { escenario_id: escenarioId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(localidadesRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing localidad', async () => {
    localidadesRepository.findOne.mockResolvedValue(localidad());

    await expect(service.remove(localidadId)).resolves.toEqual({
      message: `Localidad #${localidadId} deleted successfully`,
    });
    expect(localidadesRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('does not remove a localidad with boletas', async () => {
    const item = localidad();
    item.boletas = [Object.assign(new Boleta(), { id: 'boleta' })];
    localidadesRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(localidadId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(localidadesRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 when the localidad does not exist', async () => {
    localidadesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(localidadId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
