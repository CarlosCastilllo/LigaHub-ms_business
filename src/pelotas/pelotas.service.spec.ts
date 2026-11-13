import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Partido } from '../partidos/entities/partido.entity';
import { CreatePelotaDto } from './dto/create-pelota.dto';
import { EstadoPelota, Pelota } from './entities/pelota.entity';
import { PelotaMapper } from './mappers/pelota.mapper';
import { PelotasService } from './pelotas.service';

describe('PelotasService', () => {
  let service: PelotasService;
  let pelotasRepository: jest.Mocked<
    Pick<Repository<Pelota>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let partidosRepository: jest.Mocked<Pick<Repository<Partido>, 'findOne'>>;

  const pelotaId = '550e8400-e29b-41d4-a716-446655440130';
  const otraPelotaId = '550e8400-e29b-41d4-a716-446655440131';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const otroPartidoId = '550e8400-e29b-41d4-a716-446655440061';

  function partido(
    id = partidoId,
    pelotaAsignada: Pelota | null = null,
  ): Partido {
    return Object.assign(new Partido(), { id, pelota: pelotaAsignada });
  }

  function pelota(partidoAsignado: Partido | null = null): Pelota {
    return Object.assign(new Pelota(), {
      id: pelotaId,
      marca: 'Golty',
      modelo: 'Profesional',
      talla: 5,
      estado: EstadoPelota.NUEVA,
      partido: partidoAsignado,
    });
  }

  const createDto: CreatePelotaDto = {
    marca: 'Golty',
    modelo: 'Profesional',
    talla: 5,
  };

  beforeEach(() => {
    pelotasRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    partidosRepository = { findOne: jest.fn() };
    pelotasRepository.save.mockImplementation(
      async (entity) => entity as Pelota,
    );
    service = new PelotasService(
      pelotasRepository as unknown as Repository<Pelota>,
      partidosRepository as unknown as Repository<Partido>,
    );
  });

  it('creates a new pelota without a partido', async () => {
    const result = await service.create(createDto);

    expect(result).toEqual(
      expect.objectContaining({
        marca: 'Golty',
        estado: EstadoPelota.NUEVA,
        partido_id: null,
      }),
    );
    expect(partidosRepository.findOne).not.toHaveBeenCalled();
  });

  it('creates a pelota assigned to an available partido', async () => {
    partidosRepository.findOne.mockResolvedValue(partido());

    const result = await service.create({
      marca: 'Golty',
      modelo: 'Profesional',
      talla: 5,
      partido_id: partidoId,
    });

    expect(partidosRepository.findOne).toHaveBeenCalledWith({
      where: { id: partidoId },
      relations: { pelota: true },
    });
    expect(result.partido_id).toBe(partidoId);
  });

  it('returns 404 when the partido does not exist', async () => {
    partidosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        marca: 'Golty',
        modelo: 'Profesional',
        talla: 5,
        partido_id: partidoId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(pelotasRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a partido that already has another pelota', async () => {
    const otraPelota = Object.assign(new Pelota(), { id: otraPelotaId });
    partidosRepository.findOne.mockResolvedValue(
      partido(partidoId, otraPelota),
    );

    await expect(
      service.create({
        marca: 'Golty',
        modelo: 'Profesional',
        talla: 5,
        partido_id: partidoId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(pelotasRepository.save).not.toHaveBeenCalled();
  });

  it('keeps the same partido without a conflict', async () => {
    const item = pelota();
    const mismoPartido = partido(partidoId, item);
    item.partido = mismoPartido;
    pelotasRepository.findOne.mockResolvedValue(item);
    partidosRepository.findOne.mockResolvedValue(mismoPartido);

    const result = await service.update(pelotaId, {
      partido_id: partidoId,
      estado: EstadoPelota.USADA,
    });

    expect(result).toEqual(
      expect.objectContaining({
        partido_id: partidoId,
        estado: EstadoPelota.USADA,
      }),
    );
  });

  it('reassigns a pelota to another available partido', async () => {
    const item = pelota(partido());
    const otroPartido = partido(otroPartidoId);
    pelotasRepository.findOne.mockResolvedValue(item);
    partidosRepository.findOne.mockResolvedValue(otroPartido);

    const result = await service.update(pelotaId, {
      partido_id: otroPartidoId,
    });

    expect(item.partido).toBe(otroPartido);
    expect(result.partido_id).toBe(otroPartidoId);
  });

  it('unassigns the partido when partido_id is null', async () => {
    const item = Object.assign(pelota(partido()), { partido_id: partidoId });
    pelotasRepository.findOne.mockResolvedValue(item);

    const result = await service.update(pelotaId, { partido_id: null });

    expect(item.partido).toBeNull();
    expect(result.partido_id).toBeNull();
    expect(partidosRepository.findOne).not.toHaveBeenCalled();
  });

  it('lists pelotas with the partido relation loaded', async () => {
    const item = pelota(partido());
    pelotasRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      PelotaMapper.toResponseDto(item),
    ]);
    expect(pelotasRepository.find).toHaveBeenCalledWith({
      relations: { partido: true },
    });
  });

  it('removes an existing pelota', async () => {
    pelotasRepository.findOne.mockResolvedValue(pelota());

    await expect(service.remove(pelotaId)).resolves.toEqual({
      message: `Pelota #${pelotaId} deleted successfully`,
    });
    expect(pelotasRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the pelota does not exist', async () => {
    pelotasRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(pelotaId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
