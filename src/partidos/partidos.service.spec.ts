import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Anotacion } from '../anotaciones/entities/anotacion.entity';
import { Apuesta } from '../apuestas/entities/apuesta.entity';
import { Boleta } from '../boletas/entities/boleta.entity';
import { EstadoPelota, Pelota } from '../pelotas/entities/pelota.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { EscenarioTorneo } from '../escenarios-torneo/entities/escenario-torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { EstadoFase, Fase, TipoFase } from '../fases/entities/fase.entity';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import {
  FaseFinal,
  ModalidadFinal,
} from '../fases/entities/fase-final.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
import { EstadoTorneo, Torneo } from '../torneos/entities/torneo.entity';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { EstadoPartido, Partido } from './entities/partido.entity';
import { PartidoMapper } from './mappers/partido.mapper';
import { PartidoNotificacionesService } from './partido-notificaciones.service';
import { PartidosService } from './partidos.service';

describe('PartidosService', () => {
  let service: PartidosService;
  let partidosRepository: jest.Mocked<
    Pick<
      Repository<Partido>,
      'save' | 'find' | 'findOne' | 'remove' | 'count'
    >
  >;
  let escenariosRepository: jest.Mocked<
    Pick<Repository<Escenario>, 'findOne'>
  >;
  let equiposRepository: jest.Mocked<Pick<Repository<Equipo>, 'findOne'>>;
  let fasesRepository: jest.Mocked<Pick<Repository<Fase>, 'findOne'>>;
  let inscripcionesRepository: jest.Mocked<
    Pick<Repository<Inscripcion>, 'findOne'>
  >;
  let escenariosTorneoRepository: jest.Mocked<
    Pick<Repository<EscenarioTorneo>, 'findOne'>
  >;
  let notificaciones: { notificarNuevoPartido: jest.Mock<any> };

  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const localId = '550e8400-e29b-41d4-a716-446655440071';
  const visitanteId = '550e8400-e29b-41d4-a716-446655440072';
  const faseId = '550e8400-e29b-41d4-a716-446655440073';
  const torneoId = '550e8400-e29b-41d4-a716-446655440080';
  const grupoId = '550e8400-e29b-41d4-a716-446655440081';

  function escenario(id = escenarioId): Escenario {
    return Object.assign(new Escenario(), {
      id,
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23 # 70-50',
      capacidad: 36000,
    });
  }

  function equipo(id: string, cambios: Partial<Equipo> = {}): Equipo {
    return Object.assign(new Equipo(), {
      id,
      nombre: `Equipo ${id}`,
      activo: true,
      fase_grupos_id: null,
      ...cambios,
    });
  }

  function torneo(cambios: Partial<Torneo> = {}): Torneo {
    return Object.assign(new Torneo(), {
      id: torneoId,
      nombre: 'Copa Caldas',
      activo: true,
      estado: EstadoTorneo.EN_CURSO,
      ...cambios,
    });
  }

  function fase(id = faseId, cambios: Partial<Fase> = {}): Fase {
    return Object.assign(new Fase(), {
      id,
      numero_orden: 1,
      estado: EstadoFase.EN_CURSO,
      torneo: torneo(),
      torneo_id: torneoId,
      grupos: null,
      final: null,
      ...cambios,
    });
  }

  function partido(cambios: Partial<Partido> = {}): Partido {
    return Object.assign(new Partido(), {
      id: partidoId,
      fecha_hora: new Date('2026-11-15T19:30:00-05:00'),
      estado: EstadoPartido.PROGRAMADO,
      equipo_local: equipo(localId),
      equipo_local_id: localId,
      equipo_visitante: equipo(visitanteId),
      equipo_visitante_id: visitanteId,
      goles_local: 0,
      goles_visitante: 0,
      escenario: escenario(),
      escenario_id: escenarioId,
      fase: fase(),
      fase_id: faseId,
      ...cambios,
    });
  }

  const createDto: CreatePartidoDto = {
    fecha_hora: '2026-11-15T19:30:00-05:00',
    equipo_local_id: localId,
    equipo_visitante_id: visitanteId,
    escenario_id: escenarioId,
    fase_id: faseId,
  };

  beforeEach(() => {
    partidosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    escenariosRepository = { findOne: jest.fn() };
    equiposRepository = { findOne: jest.fn() };
    fasesRepository = { findOne: jest.fn() };
    inscripcionesRepository = { findOne: jest.fn() };
    escenariosTorneoRepository = { findOne: jest.fn() };
    notificaciones = {
      notificarNuevoPartido: jest.fn<any>().mockResolvedValue(0),
    };

    escenariosRepository.findOne.mockResolvedValue(escenario());
    equiposRepository.findOne.mockImplementation(async ({ where }) =>
      equipo((where as { id: string }).id),
    );
    fasesRepository.findOne.mockImplementation(async ({ where }) =>
      fase((where as { id: string }).id),
    );
    inscripcionesRepository.findOne.mockResolvedValue(
      Object.assign(new Inscripcion(), { id: 'inscripcion' }),
    );
    escenariosTorneoRepository.findOne.mockResolvedValue(
      Object.assign(new EscenarioTorneo(), { id: 'asignacion' }),
    );
    partidosRepository.save.mockImplementation(
      async (entity) => entity as Partido,
    );
    service = new PartidosService(
      partidosRepository as unknown as Repository<Partido>,
      escenariosRepository as unknown as Repository<Escenario>,
      equiposRepository as unknown as Repository<Equipo>,
      fasesRepository as unknown as Repository<Fase>,
      inscripcionesRepository as unknown as Repository<Inscripcion>,
      escenariosTorneoRepository as unknown as Repository<EscenarioTorneo>,
      notificaciones as unknown as PartidoNotificacionesService,
    );
  });

  describe('create', () => {
    it('crea un partido con valores por defecto y notifica a los aficionados', async () => {
      const result = await service.create(createDto, 'Bearer token');

      expect(fasesRepository.findOne).toHaveBeenCalledWith({
        where: { id: faseId },
        relations: { grupos: true, final: true, torneo: true },
      });
      expect(result).toEqual(
        expect.objectContaining({
          estado: EstadoPartido.PROGRAMADO,
          goles_local: 0,
          goles_visitante: 0,
          escenario_id: escenarioId,
          fase_id: faseId,
          torneo_id: torneoId,
          equipo_local_nombre: `Equipo ${localId}`,
        }),
      );
      expect(notificaciones.notificarNuevoPartido).toHaveBeenCalledWith(
        expect.any(Partido),
        expect.objectContaining({ id: faseId }),
        'Bearer token',
      );
    });

    it('crea un partido sin escenario', async () => {
      const result = await service.create({
        ...createDto,
        escenario_id: undefined,
      });

      expect(escenariosRepository.findOne).not.toHaveBeenCalled();
      expect(result.escenario_id).toBeNull();
    });

    it('no falla si el envío de correos falla', async () => {
      notificaciones.notificarNuevoPartido.mockRejectedValue(new Error('caído'));

      await expect(service.create(createDto)).resolves.toBeDefined();
    });

    it('rechaza un equipo que juega contra sí mismo', async () => {
      await expect(
        service.create({ ...createDto, equipo_visitante_id: localId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('responde 404 si la fase no existe', async () => {
      fasesRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('responde 404 si un equipo no existe', async () => {
      equiposRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde 404 si el escenario no existe', async () => {
      escenariosRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza un escenario que no está asignado al torneo', async () => {
      escenariosTorneoRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        'no está asignado al torneo',
      );
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un equipo inactivo', async () => {
      equiposRepository.findOne.mockImplementation(async ({ where }) => {
        const id = (where as { id: string }).id;
        return equipo(id, { activo: id !== localId });
      });

      await expect(service.create(createDto)).rejects.toThrow('está inactivo');
    });

    it('rechaza un equipo sin inscripción aceptada en el torneo', async () => {
      inscripcionesRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        'no tiene una inscripción aceptada',
      );
      expect(inscripcionesRepository.findOne).toHaveBeenCalledWith({
        where: {
          equipo: { id: localId },
          torneo: { id: torneoId },
          estado: 'ACEPTADA',
        },
      });
    });

    it('rechaza en una fase de grupos un equipo de otro grupo', async () => {
      const grupos = Object.assign(new FaseGrupos(), {
        id: grupoId,
        nombre: 'Grupo A',
      });
      fasesRepository.findOne.mockResolvedValue(fase(faseId, { grupos }));
      equiposRepository.findOne.mockImplementation(async ({ where }) => {
        const id = (where as { id: string }).id;
        return equipo(id, { fase_grupos_id: id === localId ? grupoId : null });
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'no pertenece al grupo "Grupo A"',
      );
    });

    it('rechaza partidos en una fase finalizada', async () => {
      fasesRepository.findOne.mockResolvedValue(
        fase(faseId, { estado: EstadoFase.FINALIZADA }),
      );

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rechaza partidos en un torneo inactivo o finalizado', async () => {
      fasesRepository.findOne.mockResolvedValue(
        fase(faseId, { torneo: torneo({ activo: false }) }),
      );
      await expect(service.create(createDto)).rejects.toThrow('inactivo');

      fasesRepository.findOne.mockResolvedValue(
        fase(faseId, { torneo: torneo({ estado: EstadoTorneo.FINALIZADO }) }),
      );
      await expect(service.create(createDto)).rejects.toThrow('ya finalizó');
    });
  });

  function faseFinal(estado = EstadoFase.EN_CURSO): Fase {
    return fase(faseId, {
      estado,
      final: Object.assign(new FaseFinal(), {
        id: '550e8400-e29b-41d4-a716-446655440074',
        numero_partidos: 2,
        modalidad: ModalidadFinal.IDA_Y_VUELTA,
      }),
    });
  }

  describe('fase final', () => {
    it('crea un partido de la fase final mientras haya cupo', async () => {
      fasesRepository.findOne.mockResolvedValue(faseFinal());
      partidosRepository.count.mockResolvedValue(1);

      const result = await service.create(createDto);

      expect(result.fase_tipo).toBe(TipoFase.FINAL);
    });

    it('rechaza más partidos de los que admite la fase final', async () => {
      fasesRepository.findOne.mockResolvedValue(faseFinal());
      partidosRepository.count.mockResolvedValue(2);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('no valida el cupo al reasignar a la misma fase', async () => {
      partidosRepository.findOne.mockResolvedValue(
        partido({ fase: faseFinal() }),
      );

      await service.update(partidoId, { fase_id: faseId, goles_local: 1 });

      expect(partidosRepository.count).not.toHaveBeenCalled();
    });
  });

  describe('consultas', () => {
    it('lista los partidos ordenados por fecha', async () => {
      const item = partido();
      partidosRepository.find.mockResolvedValue([item]);

      await expect(service.findAll()).resolves.toEqual([
        PartidoMapper.toResponseDto(item),
      ]);
      expect(partidosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { fecha_hora: 'ASC' } }),
      );
    });

    it('filtra los partidos por fase', async () => {
      partidosRepository.find.mockResolvedValue([partido()]);

      await service.findAll({ fase_id: faseId });

      expect(partidosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fase: { id: faseId } } }),
      );
    });

    it('filtra los partidos por torneo', async () => {
      partidosRepository.find.mockResolvedValue([]);

      await service.findAll({ torneo_id: torneoId });

      expect(partidosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fase: { torneo: { id: torneoId } } },
        }),
      );
    });

    it('responde 404 al filtrar por una fase inexistente', async () => {
      fasesRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll({ fase_id: faseId })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve el detalle con anotaciones y pelota', async () => {
      const item = partido();
      item.anotaciones = [
        Object.assign(new Anotacion(), {
          id: '550e8400-e29b-41d4-a716-446655440120',
          minuto: 23,
          descripcion: 'Gol de cabeza',
          partido: item,
        }),
      ];
      item.pelota = Object.assign(new Pelota(), {
        id: '550e8400-e29b-41d4-a716-446655440130',
        marca: 'Golty',
        modelo: 'Profesional',
        talla: 5,
        estado: EstadoPelota.NUEVA,
        partido: item,
      });
      partidosRepository.findOne.mockResolvedValue(item);

      const result = await service.findOne(partidoId);

      expect(result.anotaciones).toHaveLength(1);
      expect(result.pelota?.partido_id).toBe(partidoId);
      expect(result.escenario_nombre).toBe('Estadio Palogrande');
    });

    it('responde 404 cuando el partido no existe', async () => {
      partidosRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(partidoId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza el marcador y el estado', async () => {
      partidosRepository.findOne.mockResolvedValue(partido());

      const result = await service.update(partidoId, {
        estado: EstadoPartido.FINALIZADO,
        goles_local: 2,
        goles_visitante: 1,
      });

      expect(result).toEqual(
        expect.objectContaining({
          estado: EstadoPartido.FINALIZADO,
          goles_local: 2,
          goles_visitante: 1,
        }),
      );
    });

    it.each([EstadoPartido.FINALIZADO, EstadoPartido.CANCELADO])(
      'no permite modificar un partido %s',
      async (estado) => {
        partidosRepository.findOne.mockResolvedValue(partido({ estado }));

        await expect(
          service.update(partidoId, { goles_local: 3 }),
        ).rejects.toThrow('ya no puede modificarse');
        expect(partidosRepository.save).not.toHaveBeenCalled();
      },
    );

    it('un partido en juego solo admite marcador y estado', async () => {
      partidosRepository.findOne.mockResolvedValue(
        partido({ estado: EstadoPartido.EN_JUEGO }),
      );

      await expect(
        service.update(partidoId, { fecha_hora: '2026-12-01T10:00:00-05:00' }),
      ).rejects.toThrow('solo permite actualizar el marcador');
      await expect(
        service.update(partidoId, { goles_local: 1, fase_id: faseId }),
      ).resolves.toEqual(expect.objectContaining({ goles_local: 1 }));
    });

    it('un partido en juego no vuelve a programado', async () => {
      partidosRepository.findOne.mockResolvedValue(
        partido({ estado: EstadoPartido.EN_JUEGO }),
      );

      await expect(
        service.update(partidoId, { estado: EstadoPartido.PROGRAMADO }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('asigna un escenario del torneo a un partido que no tenía', async () => {
      const item = partido({ escenario: null, escenario_id: null });
      partidosRepository.findOne.mockResolvedValue(item);

      const result = await service.update(partidoId, {
        escenario_id: escenarioId,
      });

      expect(escenariosTorneoRepository.findOne).toHaveBeenCalled();
      expect(result.escenario_id).toBe(escenarioId);
    });

    it('quita el escenario con null', async () => {
      partidosRepository.findOne.mockResolvedValue(partido());

      const result = await service.update(partidoId, { escenario_id: null });

      expect(result.escenario_id).toBeNull();
    });

    it('no cambia el escenario si ya hay boletas vendidas', async () => {
      const item = partido();
      item.boletas = [Object.assign(new Boleta(), { id: 'boleta' })];
      partidosRepository.findOne.mockResolvedValue(item);

      await expect(
        service.update(partidoId, {
          escenario_id: '550e8400-e29b-41d4-a716-446655440099',
        }),
      ).rejects.toThrow('boletas vendidas');
    });

    it('revalida la habilitación al cambiar un equipo', async () => {
      const nuevoId = '550e8400-e29b-41d4-a716-446655440075';
      partidosRepository.findOne.mockResolvedValue(partido());
      inscripcionesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(partidoId, { equipo_visitante_id: nuevoId }),
      ).rejects.toThrow('no tiene una inscripción aceptada');
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza una actualización que deja ambos equipos iguales', async () => {
      partidosRepository.findOne.mockResolvedValue(partido());

      await expect(
        service.update(partidoId, { equipo_visitante_id: localId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reasigna el partido a otra fase existente', async () => {
      const otraFase = fase('550e8400-e29b-41d4-a716-446655440099');
      partidosRepository.findOne.mockResolvedValue(partido());
      fasesRepository.findOne.mockResolvedValue(otraFase);

      const result = await service.update(partidoId, { fase_id: otraFase.id });

      expect(result.fase_id).toBe(otraFase.id);
    });
  });

  describe('remove', () => {
    it('elimina un partido sin información asociada', async () => {
      partidosRepository.findOne.mockResolvedValue(partido());

      await expect(service.remove(partidoId)).resolves.toEqual({
        message: 'El partido se eliminó correctamente',
      });
    });

    it('elimina un partido que solo tiene anotaciones (FK CASCADE)', async () => {
      const item = partido();
      item.anotaciones = [Object.assign(new Anotacion(), { id: 'anotacion' })];
      partidosRepository.findOne.mockResolvedValue(item);

      await expect(service.remove(partidoId)).resolves.toBeDefined();
    });

    it.each([
      ['boletas', { boletas: [Object.assign(new Boleta(), { id: 'b' })] }],
      ['apuestas', { apuestas: [Object.assign(new Apuesta(), { id: 'a' })] }],
      ['pelota', { pelota: Object.assign(new Pelota(), { id: 'p' }) }],
    ])('no elimina un partido con %s', async (_nombre, cambios) => {
      partidosRepository.findOne.mockResolvedValue(
        partido(cambios as Partial<Partido>),
      );

      await expect(service.remove(partidoId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(partidosRepository.remove).not.toHaveBeenCalled();
    });
  });
});
