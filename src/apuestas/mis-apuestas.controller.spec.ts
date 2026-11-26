import { jest } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import { Equipo } from '../equipos/entities/equipo.entity';
import { MetodoPagoAficionado } from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { MetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import type { ApuestasService } from './apuestas.service';
import { CUOTAS_POR_PRONOSTICO, gananciaPotencial } from './cuotas';
import { CreateMiApuestaDto } from './dto/create-mi-apuesta.dto';
import {
  Apuesta,
  EstadoApuesta,
  PronosticoApuesta,
} from './entities/apuesta.entity';
import { MisApuestasController } from './mis-apuestas.controller';

describe('MisApuestasController', () => {
  const userId = 42;
  const aficionadoId = 'aficionado-propio';
  const partidoId = '550e8400-e29b-41d4-a716-446655440060';
  const metodoId = '550e8400-e29b-41d4-a716-446655440120';
  const dto = {
    partido_id: partidoId,
    pronostico: PronosticoApuesta.EMPATE,
    monto: 10000,
    metodo_pago_aficionado_id: metodoId,
  };
  const apuesta = Object.assign(new Apuesta(), {
    id: 'apuesta-propia',
    fecha_apuesta: new Date('2026-11-20T10:00:00Z'),
    monto: 10000,
    pronostico: PronosticoApuesta.EMPATE,
    cuota: 3,
    estado: EstadoApuesta.PENDIENTE,
    partido: Object.assign(new Partido(), {
      id: partidoId,
      fecha_hora: new Date('2026-12-01T20:00:00Z'),
      estado: EstadoPartido.PROGRAMADO,
      equipo_local: Object.assign(new Equipo(), { nombre: 'Tigres' }),
      equipo_visitante: Object.assign(new Equipo(), { nombre: 'Leones' }),
    }),
    metodo_pago_aficionado: Object.assign(new MetodoPagoAficionado(), {
      id: metodoId,
      referencia: '**** 4242',
      metodo_pago: Object.assign(new MetodoPago(), { nombre: 'Visa' }),
    }),
  });

  const resolverAficionado = jest.fn<MiAficionadoService['resolverAficionado']>();
  const service = {
    create: jest.fn<ApuestasService['create']>(),
    findByAficionado: jest.fn<ApuestasService['findByAficionado']>(),
    findOwned: jest.fn<ApuestasService['findOwned']>(),
  };
  const controller = new MisApuestasController(
    { resolverAficionado } as unknown as MiAficionadoService,
    service as unknown as ApuestasService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolverAficionado.mockResolvedValue(
      { id: aficionadoId } as Awaited<ReturnType<typeof resolverAficionado>>,
    );
  });

  it('bets for the fan of the session with the fixed cuota of the pronostico', async () => {
    service.create.mockResolvedValue(
      { id: apuesta.id } as Awaited<ReturnType<typeof service.create>>,
    );
    service.findOwned.mockResolvedValue(apuesta);

    const result = await controller.apostar(userId, dto);

    expect(service.create).toHaveBeenCalledWith({
      ...dto,
      aficionado_id: aficionadoId,
      cuota: CUOTAS_POR_PRONOSTICO[PronosticoApuesta.EMPATE],
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: apuesta.id,
        cuota: 3,
        ganancia_potencial: 30000,
        estado: EstadoApuesta.PENDIENTE,
        metodo_pago_referencia: '**** 4242',
        metodo_pago_nombre: 'Visa',
      }),
    );
  });

  it('uses the server table for every pronostico', () => {
    expect(CUOTAS_POR_PRONOSTICO).toEqual({
      [PronosticoApuesta.LOCAL]: 2,
      [PronosticoApuesta.EMPATE]: 3,
      [PronosticoApuesta.VISITANTE]: 2.5,
    });
    expect(gananciaPotencial(10000.5, 2.5)).toBe(25001.25);
    expect(gananciaPotencial(333.33, 3)).toBe(999.99);
  });

  it('propagates the rejection of a payment method of another fan', async () => {
    service.create.mockRejectedValue(
      new BadRequestException('no pertenece al aficionado'),
    );

    await expect(controller.apostar(userId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists only the apuestas of the fan of the session', async () => {
    service.findByAficionado.mockResolvedValue([apuesta]);

    await expect(controller.findMine(userId)).resolves.toHaveLength(1);
    expect(service.findByAficionado).toHaveBeenCalledWith(aficionadoId);
  });

  it('returns 404 before betting if the user is not a fan', async () => {
    resolverAficionado.mockRejectedValue(
      new NotFoundException('Tu usuario todavía no es aficionado'),
    );

    await expect(controller.apostar(userId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects owner, cuota and state fields in the bet body', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    for (const extra of [
      { aficionado_id: aficionadoId },
      { cuota: 50 },
      { estado: EstadoApuesta.GANADA },
    ]) {
      await expect(
        pipe.transform(
          { ...dto, ...extra },
          { type: 'body', metatype: CreateMiApuestaDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
