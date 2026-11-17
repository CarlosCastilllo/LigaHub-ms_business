import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
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

  const equipo = (activo = true) =>
    Object.assign(new Equipo(), { id: equipoId, nombre: 'Tigres', activo });
  const jugador = (activo = true) =>
    Object.assign(new Jugador(), { id: jugadorId, activo });

  function relacion(activo = true): EquipoJugador {
    return Object.assign(new EquipoJugador(), {
      id: relacionId,
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: null,
      activo,
      equipo: equipo(),
      jugador: jugador(),
    });
  }

  const duplicateEntry = () =>
    new QueryFailedError('INSERT', [], { code: 'ER_DUP_ENTRY' } as never);

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
    relacionesRepository.findOne.mockResolvedValue(null);
    equiposRepository.findOne.mockResolvedValue(equipo());
    jugadoresRepository.findOne.mockResolvedValue(jugador());
    service = new EquipoJugadorService(
      relacionesRepository as unknown as Repository<EquipoJugador>,
      equiposRepository as unknown as Repository<Equipo>,
      jugadoresRepository as unknown as Repository<Jugador>,
    );
  });

  describe('create', () => {
    it('creates an active dated contract with an open end date', async () => {
      await expect(service.create(dto)).resolves.toEqual({
        id: undefined,
        ...dto,
        activo: true,
      });
      expect(relacionesRepository.findOne).toHaveBeenCalledWith({
        where: { jugador: { id: jugadorId }, activo: true },
      });
    });

    it('accepts a contract with a defined end date', async () => {
      await expect(
        service.create({ ...dto, fecha_fin: '2026-12-31' }),
      ).resolves.toEqual(expect.objectContaining({ fecha_fin: '2026-12-31' }));
    });

    it('rejects a contract whose end date is before its start date', async () => {
      await expect(
        service.create({ ...dto, fecha_fin: '2026-01-14' }),
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

    it('rejects an inactive team', async () => {
      equiposRepository.findOne.mockResolvedValue(equipo(false));

      await expect(service.create(dto)).rejects.toThrow(
        `Equipo ${equipoId} is not active`,
      );
      expect(relacionesRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an inactive player', async () => {
      jugadoresRepository.findOne.mockResolvedValue(jugador(false));

      await expect(service.create(dto)).rejects.toThrow(
        `Jugador ${jugadorId} is not active`,
      );
      expect(relacionesRepository.save).not.toHaveBeenCalled();
    });

    it('blocks registering the same active association twice', async () => {
      relacionesRepository.findOne.mockResolvedValue(relacion());

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(relacionesRepository.save).not.toHaveBeenCalled();
    });

    it('blocks a player with an active contract in another team', async () => {
      const otroEquipo = Object.assign(new Equipo(), {
        id: '550e8400-e29b-41d4-a716-446655440299',
        activo: true,
      });
      relacionesRepository.findOne.mockResolvedValue(
        Object.assign(relacion(), { equipo: otroEquipo }),
      );

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('translates a concurrent duplicate insert into 409', async () => {
      relacionesRepository.save.mockRejectedValue(duplicateEntry());

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('allows assigning a player again once the previous contract was retired', async () => {
      // Los contratos retirados no cuentan: la búsqueda solo considera activo=true.
      relacionesRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).resolves.toEqual(
        expect.objectContaining({ activo: true, equipo_id: equipoId }),
      );
    });
  });

  describe('findAll', () => {
    it('lists every contract with relations, active ones first', async () => {
      relacionesRepository.find.mockResolvedValue([relacion()]);

      await service.findAll();

      expect(relacionesRepository.find).toHaveBeenCalledWith({
        where: undefined,
        relations: { equipo: true, jugador: true },
        order: { activo: 'DESC', fecha_inicio: 'DESC' },
      });
    });

    it('filters the players of a team', async () => {
      relacionesRepository.find.mockResolvedValue([relacion()]);

      await expect(service.findAll({ equipo_id: equipoId })).resolves.toEqual([
        expect.objectContaining({ equipo_id: equipoId, jugador_id: jugadorId }),
      ]);
      expect(relacionesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { equipo: { id: equipoId } } }),
      );
    });

    it('filters the teams of a player', async () => {
      relacionesRepository.find.mockResolvedValue([]);

      await service.findAll({ jugador_id: jugadorId });

      expect(relacionesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { jugador: { id: jugadorId } } }),
      );
    });

    it('returns 404 when a filter references a missing team or player', async () => {
      equiposRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findAll({ equipo_id: equipoId }),
      ).rejects.toBeInstanceOf(NotFoundException);

      jugadoresRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findAll({ jugador_id: jugadorId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(relacionesRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('retirar', () => {
    it('retires the player keeping the contract as history', async () => {
      const item = relacion();
      relacionesRepository.findOne.mockResolvedValue(item);

      await expect(
        service.retirar(relacionId, { fecha_fin: '2026-06-30' }),
      ).resolves.toEqual(
        expect.objectContaining({
          id: relacionId,
          activo: false,
          fecha_fin: '2026-06-30',
        }),
      );
      expect(relacionesRepository.save).toHaveBeenCalledWith(item);
      expect(relacionesRepository.remove).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown contract', async () => {
      await expect(
        service.retirar(relacionId, { fecha_fin: '2026-06-30' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 409 when the contract was already retired', async () => {
      relacionesRepository.findOne.mockResolvedValue(relacion(false));

      await expect(
        service.retirar(relacionId, { fecha_fin: '2026-06-30' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(relacionesRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a departure date before the contract start', async () => {
      relacionesRepository.findOne.mockResolvedValue(relacion());

      await expect(
        service.retirar(relacionId, { fecha_fin: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(relacionesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only the contract dates', async () => {
      const item = relacion();
      relacionesRepository.findOne.mockResolvedValue(item);

      const result = await service.update(relacionId, {
        fecha_fin: '2026-02-01',
      });

      expect(result).toEqual(
        expect.objectContaining({
          equipo_id: equipoId,
          jugador_id: jugadorId,
          fecha_inicio: dto.fecha_inicio,
          fecha_fin: '2026-02-01',
        }),
      );
      expect(equiposRepository.findOne).not.toHaveBeenCalled();
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
  });
});
