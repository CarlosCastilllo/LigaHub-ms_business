import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import type { BoletasService } from './boletas.service';
import { CreateMiBoletaDto } from './dto/create-mi-boleta.dto';
import { Boleta, EstadoBoleta } from './entities/boleta.entity';
import { MisBoletasController } from './mis-boletas.controller';

describe('MisBoletasController', () => {
  const userId = 42;
  const aficionadoId = 'aficionado-propio';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const localidadId = '550e8400-e29b-41d4-a716-446655440050';
  const dto = { partido_id: partidoId, localidad_id: localidadId };
  const boleta = Object.assign(new Boleta(), {
    id: 'boleta-propia',
    fecha_compra: new Date('2026-11-20T10:00:00Z'),
    precio: 45000,
    estado: EstadoBoleta.ACTIVA,
    partido: Object.assign(new Partido(), {
      id: partidoId,
      fecha_hora: new Date('2026-12-01T20:00:00Z'),
      estado: EstadoPartido.PROGRAMADO,
      equipo_local: Object.assign(new Equipo(), { nombre: 'Tigres' }),
      equipo_visitante: Object.assign(new Equipo(), { nombre: 'Leones' }),
      escenario: Object.assign(new Escenario(), { nombre: 'Estadio' }),
    }),
    localidad: Object.assign(new Localidad(), {
      id: localidadId,
      nombre: 'Oriental',
    }),
  });

  const resolverAficionado = jest.fn<MiAficionadoService['resolverAficionado']>();
  const service = {
    create: jest.fn<BoletasService['create']>(),
    findByAficionado: jest.fn<BoletasService['findByAficionado']>(),
    findOwned: jest.fn<BoletasService['findOwned']>(),
    partidosDisponibles: jest.fn<BoletasService['partidosDisponibles']>(),
  };
  const controller = new MisBoletasController(
    { resolverAficionado } as unknown as MiAficionadoService,
    service as unknown as BoletasService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolverAficionado.mockResolvedValue(
      { id: aficionadoId } as Awaited<ReturnType<typeof resolverAficionado>>,
    );
  });

  it('buys for the fan of the session, only for programmed partidos', async () => {
    service.create.mockResolvedValue(
      { id: boleta.id } as Awaited<ReturnType<typeof service.create>>,
    );
    service.findOwned.mockResolvedValue(boleta);

    const result = await controller.comprar(userId, dto);

    expect(resolverAficionado).toHaveBeenCalledWith(userId);
    expect(service.create).toHaveBeenCalledWith(
      { aficionado_id: aficionadoId, ...dto },
      { soloPartidosProgramados: true },
    );
    expect(service.findOwned).toHaveBeenCalledWith(boleta.id, aficionadoId);
    expect(result).toEqual({
      id: boleta.id,
      fecha_compra: boleta.fecha_compra,
      precio: 45000,
      estado: EstadoBoleta.ACTIVA,
      partido: {
        id: partidoId,
        fecha_hora: boleta.partido.fecha_hora,
        estado: EstadoPartido.PROGRAMADO,
        equipo_local_nombre: 'Tigres',
        equipo_visitante_nombre: 'Leones',
      },
      escenario_nombre: 'Estadio',
      localidad_id: localidadId,
      localidad_nombre: 'Oriental',
    });
  });

  it('propagates the sold-out conflict', async () => {
    service.create.mockRejectedValue(new ConflictException('agotada'));

    await expect(controller.comprar(userId, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lists only the boletas of the fan of the session', async () => {
    service.findByAficionado.mockResolvedValue([boleta]);

    await expect(controller.findMine(userId)).resolves.toHaveLength(1);
    expect(service.findByAficionado).toHaveBeenCalledWith(aficionadoId);
  });

  it('returns 404 before reading boletas if the user is not a fan', async () => {
    resolverAficionado.mockRejectedValue(
      new NotFoundException('Tu usuario todavía no es aficionado'),
    );

    await expect(controller.findMine(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(service.findByAficionado).not.toHaveBeenCalled();
  });

  it('rejects owner, price and state fields in the purchase body', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    for (const extra of [
      { aficionado_id: aficionadoId },
      { precio: 1 },
      { estado: EstadoBoleta.USADA },
    ]) {
      await expect(
        pipe.transform(
          { ...dto, ...extra },
          { type: 'body', metatype: CreateMiBoletaDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
