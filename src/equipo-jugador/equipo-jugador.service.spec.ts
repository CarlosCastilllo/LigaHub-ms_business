import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EquipoJugador } from './entities/equipo-jugador.entity';
import { EquipoJugadorService } from './equipo-jugador.service';

describe('EquipoJugadorService', () => {
  let service: EquipoJugadorService;
  let relacionesRepository: jest.Mocked<
    Pick<Repository<EquipoJugador>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let equiposRepository: jest.Mocked<Pick<Repository<Equipo>, 'findOne'>>;
  let jugadoresRepository: jest.Mocked<Pick<Repository<Jugador>, 'findOne'>>;

  const equipoId = '550e8400-e29b-41d4-a716-446655440220';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440210';
  const relacionId = '550e8400-e29b-41d4-a716-446655440221';
  const dto = {
    equipo_id: equipoId,
    jugador_id: jugadorId,
    fecha_inicio: '2026-01-15',
    fecha_fin: null,
  };

  function relacion(): EquipoJugador {
    return Object.assign(new EquipoJugador(), {
      id: relacionId,
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: null,
      equipo: Object.assign(new Equipo(), { id: equipoId, nombre: 'Tigres' }),
      jugador: Object.assign(new Jugador(), { id: jugadorId }),
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
    jugadoresRepository = { findOne: jest.fn() };
    relacionesRepository.save.mockImplementation(
      async (entity) => entity as EquipoJugador,
    );
    equiposRepository.findOne.mockResolvedValue(relacion().equipo);
    jugadoresRepository.findOne.mockResolvedValue(relacion().jugador);
    service = new EquipoJugadorService(
      relacionesRepository as unknown as Repository<EquipoJugador>,
      equiposRepository as unknown as Repository<Equipo>,
      jugadoresRepository as unknown as Repository<Jugador>,
    );
  });

  it('creates a dated team membership with an open end date', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      id: undefined,
      ...dto,
    });
  });

  it('rejects a membership whose end date is before its start date', async () => {
    await expect(
      service.create({
        ...dto,
        fecha_fin: '2026-01-14',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(equiposRepository.findOne).not.toHaveBeenCalled();
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('returns 404 when the team does not exist', async () => {
    equiposRepository.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('returns 404 when the player does not exist', async () => {
    jugadoresRepository.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('updates membership dates and the referenced team or player', async () => {
    const item = relacion();
    relacionesRepository.findOne.mockResolvedValue(item);
    const nextEquipoId = '550e8400-e29b-41d4-a716-446655440222';
    const nextEquipo = Object.assign(new Equipo(), {
      id: nextEquipoId,
      nombre: 'Leones',
    });
    equiposRepository.findOne.mockResolvedValue(nextEquipo);

    const result = await service.update(relacionId, {
      equipo_id: nextEquipoId,
      fecha_fin: '2026-02-01',
    });

    expect(item.equipo).toBe(nextEquipo);
    expect(result).toEqual(
      expect.objectContaining({
        equipo_id: nextEquipoId,
        fecha_inicio: dto.fecha_inicio,
        fecha_fin: '2026-02-01',
      }),
    );
  });

  it('blocks changing dates into an invalid range', async () => {
    relacionesRepository.findOne.mockResolvedValue(
      Object.assign(relacion(), { fecha_fin: '2026-01-31' }),
    );

    await expect(
      service.update(relacionId, { fecha_inicio: '2026-02-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('lists memberships with both relations loaded', async () => {
    relacionesRepository.find.mockResolvedValue([relacion()]);

    await service.findAll();

    expect(relacionesRepository.find).toHaveBeenCalledWith({
      relations: { equipo: true, jugador: true },
    });
  });
});
