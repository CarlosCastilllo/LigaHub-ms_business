import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { EquipoJugador } from '../equipo-jugador/entities/equipo-jugador.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { PartidoNotificacionesService } from '../partidos/partido-notificaciones.service';
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { Anotacion } from './entities/anotacion.entity';

describe('AnotacionesService', () => {
  let service: AnotacionesService;
  let anotacionesRepository: {
    save: jest.Mock<any>;
    find: jest.Mock<any>;
    findOne: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let partidosRepository: { findOne: jest.Mock<any> };
  let jugadoresRepository: { findOne: jest.Mock<any> };
  let equipoJugadorRepository: { find: jest.Mock<any> };
  let notificaciones: { notificarGol: jest.Mock<any> };

  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const anotacionId = '550e8400-e29b-41d4-a716-446655440120';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440121';
  const otroJugadorId = '550e8400-e29b-41d4-a716-446655440122';
  const localId = '550e8400-e29b-41d4-a716-446655440071';
  const visitanteId = '550e8400-e29b-41d4-a716-446655440072';

  const equipo = (id: string, nombre: string) =>
    Object.assign(new Equipo(), { id, nombre });
  const local = equipo(localId, 'Once Caldas');
  const visitante = equipo(visitanteId, 'Manizales FC');

  function partido(estado = EstadoPartido.EN_JUEGO): Partido {
    return Object.assign(new Partido(), {
      id: partidoId,
      estado,
      fecha_hora: new Date('2026-11-15T19:30:00-05:00'),
      equipo_local: local,
      equipo_visitante: visitante,
    });
  }

  function vinculo(
    equipoVinculo: Equipo,
    cambios: Partial<EquipoJugador> = {},
  ): EquipoJugador {
    return Object.assign(new EquipoJugador(), {
      id: `ej-${equipoVinculo.id}`,
      equipo: equipoVinculo,
      fecha_inicio: '2026-01-01',
      fecha_fin: null,
      activo: true,
      ...cambios,
    });
  }

  function anotacion(estado = EstadoPartido.EN_JUEGO): Anotacion {
    return Object.assign(new Anotacion(), {
      id: anotacionId,
      minuto: 23,
      descripcion: 'Gol de cabeza',
      partido: partido(estado),
      jugador: Object.assign(new Jugador(), { id: jugadorId }),
      equipo: local,
    });
  }

  const createDto: CreateAnotacionDto = {
    minuto: 23,
    descripcion: 'Gol de cabeza',
    partido_id: partidoId,
    jugador_id: jugadorId,
  };

  beforeEach(() => {
    anotacionesRepository = {
      save: jest.fn<any>(async (entity: Anotacion) =>
        Object.assign(entity, { id: entity.id ?? anotacionId }),
      ),
      find: jest.fn<any>(),
      findOne: jest.fn<any>(),
      remove: jest.fn<any>(),
    };
    partidosRepository = { findOne: jest.fn<any>().mockResolvedValue(partido()) };
    jugadoresRepository = {
      findOne: jest.fn<any>(async ({ where }: { where: { id: string } }) =>
        Object.assign(new Jugador(), { id: where.id }),
      ),
    };
    equipoJugadorRepository = {
      find: jest.fn<any>().mockResolvedValue([vinculo(local)]),
    };
    notificaciones = { notificarGol: jest.fn<any>().mockResolvedValue(1) };
    service = new AnotacionesService(
      anotacionesRepository as unknown as Repository<Anotacion>,
      partidosRepository as unknown as Repository<Partido>,
      jugadoresRepository as unknown as Repository<Jugador>,
      equipoJugadorRepository as unknown as Repository<EquipoJugador>,
      notificaciones as unknown as PartidoNotificacionesService,
    );
  });

  describe('create', () => {
    it('registra el gol para el equipo del jugador y lo notifica', async () => {
      const result = await service.create(createDto, 'Bearer t');

      expect(result).toEqual({
        id: anotacionId,
        minuto: 23,
        descripcion: 'Gol de cabeza',
        partido_id: partidoId,
        jugador_id: jugadorId,
        equipo_id: localId,
      });
      expect(notificaciones.notificarGol).toHaveBeenCalledWith(
        partidoId,
        anotacionId,
        'Bearer t',
      );
    });

    it('guarda la descripción vacía como null', async () => {
      const result = await service.create({ ...createDto, descripcion: '  ' });

      expect(result.descripcion).toBeNull();
    });

    it('en un partido finalizado registra la corrección sin enviar correo', async () => {
      partidosRepository.findOne.mockResolvedValue(partido(EstadoPartido.FINALIZADO));

      await expect(service.create(createDto)).resolves.toBeDefined();
      expect(notificaciones.notificarGol).not.toHaveBeenCalled();
    });

    it('no falla si el envío del correo falla', async () => {
      notificaciones.notificarGol.mockRejectedValue(new Error('caído'));

      await expect(service.create(createDto)).resolves.toBeDefined();
    });

    it.each([EstadoPartido.PROGRAMADO, EstadoPartido.CANCELADO])(
      'rechaza goles en un partido %s',
      async (estado) => {
        partidosRepository.findOne.mockResolvedValue(partido(estado));

        await expect(service.create(createDto)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(anotacionesRepository.save).not.toHaveBeenCalled();
      },
    );

    it('responde 404 si el partido no existe', async () => {
      partidosRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde 404 si el jugador no existe', async () => {
      jugadoresRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza un jugador que no pertenece a los equipos del partido', async () => {
      equipoJugadorRepository.find.mockResolvedValue([]);

      await expect(service.create(createDto)).rejects.toThrow(
        'El jugador no pertenece a ninguno de los equipos del partido',
      );
      expect(anotacionesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un jugador que figura en ambos equipos', async () => {
      equipoJugadorRepository.find.mockResolvedValue([
        vinculo(local),
        vinculo(visitante),
      ]);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('acepta un vínculo ya retirado si estaba vigente en la fecha del partido', async () => {
      equipoJugadorRepository.find.mockResolvedValue([
        vinculo(visitante, { activo: false, fecha_fin: '2026-11-20' }),
      ]);

      await expect(service.create(createDto)).resolves.toEqual(
        expect.objectContaining({ equipo_id: visitanteId }),
      );
    });

    it('ignora un vínculo retirado antes de la fecha del partido', async () => {
      equipoJugadorRepository.find.mockResolvedValue([
        vinculo(visitante, { activo: false, fecha_fin: '2026-11-01' }),
      ]);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('consultas', () => {
    it('lista los goles de un partido ordenados por minuto', async () => {
      anotacionesRepository.find.mockResolvedValue([anotacion()]);

      const result = await service.findAll({ partido_id: partidoId });

      expect(result).toHaveLength(1);
      expect(anotacionesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partido: { id: partidoId } },
          order: { minuto: 'ASC' },
        }),
      );
    });

    it('responde 404 al filtrar por un partido inexistente', async () => {
      partidosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAll({ partido_id: partidoId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('responde 404 si la anotación no existe', async () => {
      anotacionesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(anotacionId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza minuto y descripción sin revalidar al jugador', async () => {
      anotacionesRepository.findOne.mockResolvedValue(anotacion());

      const result = await service.update(anotacionId, {
        minuto: 45,
        descripcion: 'De penal',
      });

      expect(result).toEqual(
        expect.objectContaining({ minuto: 45, descripcion: 'De penal' }),
      );
      expect(equipoJugadorRepository.find).not.toHaveBeenCalled();
    });

    it('al cambiar el jugador recalcula el equipo del gol', async () => {
      anotacionesRepository.findOne.mockResolvedValue(anotacion());
      equipoJugadorRepository.find.mockResolvedValue([vinculo(visitante)]);

      const result = await service.update(anotacionId, {
        jugador_id: otroJugadorId,
      });

      expect(result).toEqual(
        expect.objectContaining({
          jugador_id: otroJugadorId,
          equipo_id: visitanteId,
          partido_id: partidoId,
        }),
      );
    });

    it('permite corregir un gol de un partido finalizado', async () => {
      anotacionesRepository.findOne.mockResolvedValue(
        anotacion(EstadoPartido.FINALIZADO),
      );

      await expect(
        service.update(anotacionId, { minuto: 50 }),
      ).resolves.toEqual(expect.objectContaining({ minuto: 50 }));
    });

    it('no modifica goles de un partido cancelado', async () => {
      anotacionesRepository.findOne.mockResolvedValue(
        anotacion(EstadoPartido.CANCELADO),
      );

      await expect(
        service.update(anotacionId, { minuto: 50 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(anotacionesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina solo la anotación', async () => {
      const item = anotacion();
      anotacionesRepository.findOne.mockResolvedValue(item);

      await expect(service.remove(anotacionId)).resolves.toEqual({
        message: 'La anotación se eliminó correctamente',
      });
      expect(anotacionesRepository.remove).toHaveBeenCalledWith(item);
    });

    it('no elimina goles de un partido programado', async () => {
      anotacionesRepository.findOne.mockResolvedValue(
        anotacion(EstadoPartido.PROGRAMADO),
      );

      await expect(service.remove(anotacionId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(anotacionesRepository.remove).not.toHaveBeenCalled();
    });
  });
});
