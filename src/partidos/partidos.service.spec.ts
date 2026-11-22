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
import { Equipo } from '../equipos/entities/equipo.entity';
import { EstadoFase, Fase, TipoFase } from '../fases/entities/fase.entity';
import {
  FaseFinal,
  ModalidadFinal,
} from '../fases/entities/fase-final.entity';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { EstadoPartido, Partido } from './entities/partido.entity';
import { PartidoMapper } from './mappers/partido.mapper';
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

  const escenarioId = '550e8400-e29b-41d4-a716-446655440010';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const localId = '550e8400-e29b-41d4-a716-446655440071';
  const visitanteId = '550e8400-e29b-41d4-a716-446655440072';
  const faseId = '550e8400-e29b-41d4-a716-446655440073';

  function escenario(id = escenarioId): Escenario {
    return Object.assign(new Escenario(), {
      id,
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23 # 70-50',
      capacidad: 36000,
    });
  }

  function equipo(id: string): Equipo {
    return Object.assign(new Equipo(), { id, nombre: `Equipo ${id}` });
  }

  function fase(id = faseId): Fase {
    return Object.assign(new Fase(), { id });
  }

  function partido(): Partido {
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
    equiposRepository.findOne.mockImplementation(async ({ where }) => {
      const id = (where as { id: string }).id;
      return equipo(id);
    });
    fasesRepository.findOne.mockImplementation(async ({ where }) =>
      fase((where as { id: string }).id),
    );
    partidosRepository.save.mockImplementation(
      async (entity) => entity as Partido,
    );
    service = new PartidosService(
      partidosRepository as unknown as Repository<Partido>,
      escenariosRepository as unknown as Repository<Escenario>,
      equiposRepository as unknown as Repository<Equipo>,
      fasesRepository as unknown as Repository<Fase>,
    );
  });

  it('creates a partido in an existing escenario with default values', async () => {
    escenariosRepository.findOne.mockResolvedValue(escenario());

    const result = await service.create(createDto);

    expect(escenariosRepository.findOne).toHaveBeenCalledWith({
      where: { id: escenarioId },
    });
    expect(equiposRepository.findOne).toHaveBeenCalledTimes(2);
    expect(fasesRepository.findOne).toHaveBeenCalledWith({
      where: { id: faseId },
      relations: { grupos: true, final: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        fecha_hora: new Date('2026-11-15T19:30:00-05:00'),
        estado: EstadoPartido.PROGRAMADO,
        goles_local: 0,
        goles_visitante: 0,
        escenario_id: escenarioId,
        fase_id: faseId,
      }),
    );
  });

  it('rejects creation when the escenario does not exist', async () => {
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects creation when a referenced team does not exist', async () => {
    equiposRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a partido where a team plays against itself', async () => {
    await expect(
      service.create({
        fecha_hora: createDto.fecha_hora,
        equipo_local_id: localId,
        equipo_visitante_id: localId,
        escenario_id: escenarioId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('lists partidos with the escenario relation loaded', async () => {
    const item = partido();
    partidosRepository.find.mockResolvedValue([item]);

    await expect(service.findAll()).resolves.toEqual([
      PartidoMapper.toResponseDto(item),
    ]);
    expect(partidosRepository.find).toHaveBeenCalledWith({
      relations: {
        escenario: true,
        boletas: true,
        apuestas: true,
        anotaciones: true,
        pelota: true,
        equipo_local: true,
        equipo_visitante: true,
        fase: { grupos: true, final: true },
      },
    });
  });

  function faseFinal(estado = EstadoFase.EN_CURSO): Fase {
    return Object.assign(fase(), {
      estado,
      grupos: null,
      final: Object.assign(new FaseFinal(), {
        id: '550e8400-e29b-41d4-a716-446655440074',
        numero_partidos: 2,
        modalidad: ModalidadFinal.IDA_Y_VUELTA,
      }),
    });
  }

  describe('fase final', () => {
    beforeEach(() => {
      escenariosRepository.findOne.mockResolvedValue(escenario());
    });

    it('crea un partido de la fase final mientras haya cupo', async () => {
      fasesRepository.findOne.mockResolvedValue(faseFinal());
      partidosRepository.count.mockResolvedValue(1);

      const result = await service.create(createDto);

      expect(result.fase_tipo).toBe(TipoFase.FINAL);
      expect(partidosRepository.count).toHaveBeenCalledWith({
        where: { fase: { id: faseId } },
      });
    });

    it('rechaza más partidos de los que admite la fase final', async () => {
      fasesRepository.findOne.mockResolvedValue(faseFinal());
      partidosRepository.count.mockResolvedValue(2);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza partidos en una fase final finalizada', async () => {
      fasesRepository.findOne.mockResolvedValue(
        faseFinal(EstadoFase.FINALIZADA),
      );

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(partidosRepository.save).not.toHaveBeenCalled();
    });

    it('no valida el cupo al reasignar a la misma fase', async () => {
      const item = Object.assign(partido(), { fase: faseFinal() });
      partidosRepository.findOne.mockResolvedValue(item);

      await service.update(partidoId, { fase_id: faseId, goles_local: 1 });

      expect(partidosRepository.count).not.toHaveBeenCalled();
    });

    it('filtra los partidos por fase', async () => {
      const item = Object.assign(partido(), { fase: faseFinal() });
      partidosRepository.find.mockResolvedValue([item]);

      const result = await service.findAll({ fase_id: faseId });

      expect(result[0].fase_tipo).toBe(TipoFase.FINAL);
      expect(partidosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fase: { id: faseId } } }),
      );
    });

    it('responde 404 al filtrar por una fase inexistente', async () => {
      fasesRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll({ fase_id: faseId })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('rejects creation when the referenced phase does not exist', async () => {
    fasesRepository.findOne.mockResolvedValue(null);
    escenariosRepository.findOne.mockResolvedValue(escenario());

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('updates the score and state of a partido', async () => {
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
        equipo_local_id: localId,
      }),
    );
  });

  it('reassigns a partido to an existing escenario', async () => {
    const item = partido();
    const otroEscenario = escenario('550e8400-e29b-41d4-a716-446655440099');
    partidosRepository.findOne.mockResolvedValue(item);
    escenariosRepository.findOne.mockResolvedValue(otroEscenario);

    const result = await service.update(partidoId, {
      escenario_id: otroEscenario.id,
    });

    expect(item.escenario).toBe(otroEscenario);
    expect(result.escenario_id).toBe(otroEscenario.id);
  });

  it('reassigns a partido to an existing phase', async () => {
    const item = partido();
    const otraFase = fase('550e8400-e29b-41d4-a716-446655440099');
    partidosRepository.findOne.mockResolvedValue(item);
    fasesRepository.findOne.mockResolvedValue(otraFase);

    const result = await service.update(partidoId, { fase_id: otraFase.id });

    expect(item.fase).toBe(otraFase);
    expect(result.fase_id).toBe(otraFase.id);
  });

  it('does not reassign a partido to a missing escenario', async () => {
    partidosRepository.findOne.mockResolvedValue(partido());
    escenariosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(partidoId, { escenario_id: escenarioId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an update that leaves both teams equal', async () => {
    partidosRepository.findOne.mockResolvedValue(partido());

    await expect(
      service.update(partidoId, { equipo_visitante_id: localId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(partidosRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing partido', async () => {
    partidosRepository.findOne.mockResolvedValue(partido());

    await expect(service.remove(partidoId)).resolves.toEqual({
      message: 'El partido se eliminó correctamente',
    });
    expect(partidosRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('does not remove a partido with boletas', async () => {
    const item = partido();
    item.boletas = [Object.assign(new Boleta(), { id: 'boleta' })];
    partidosRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(partidoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(partidosRepository.remove).not.toHaveBeenCalled();
  });

  it('does not remove a partido with apuestas', async () => {
    const item = partido();
    item.apuestas = [Object.assign(new Apuesta(), { id: 'apuesta' })];
    partidosRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(partidoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(partidosRepository.remove).not.toHaveBeenCalled();
  });

  it('returns the anotaciones of a partido', async () => {
    const item = partido();
    item.anotaciones = [
      Object.assign(new Anotacion(), {
        id: '550e8400-e29b-41d4-a716-446655440120',
        minuto: 23,
        descripcion: 'Gol de cabeza tras tiro de esquina',
        partido: item,
      }),
    ];
    partidosRepository.findOne.mockResolvedValue(item);

    const result = await service.findOne(partidoId);

    expect(result.anotaciones).toEqual([
      {
        id: '550e8400-e29b-41d4-a716-446655440120',
        minuto: 23,
        descripcion: 'Gol de cabeza tras tiro de esquina',
        partido_id: partidoId,
      },
    ]);
  });

  it('removes a partido that only has anotaciones (FK CASCADE)', async () => {
    const item = partido();
    item.anotaciones = [Object.assign(new Anotacion(), { id: 'anotacion' })];
    partidosRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(partidoId)).resolves.toBeDefined();
    expect(partidosRepository.remove).toHaveBeenCalledWith(item);
  });

  it('returns the pelota of a partido', async () => {
    const item = partido();
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

    expect(result.pelota).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440130',
      marca: 'Golty',
      modelo: 'Profesional',
      talla: 5,
      estado: EstadoPelota.NUEVA,
      partido_id: partidoId,
    });
  });

  it('does not remove a partido with a pelota assigned', async () => {
    const item = partido();
    item.pelota = Object.assign(new Pelota(), { id: 'pelota' });
    partidosRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(partidoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(partidosRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 when the partido does not exist', async () => {
    partidosRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(partidoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
