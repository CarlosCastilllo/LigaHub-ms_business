import { jest } from '@jest/globals';
import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { MiAficionadoService } from '../aficionados/mi-aficionado/mi-aficionado.service';
import type { MetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { TipoMetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { CreateMiMetodoPagoDto } from './dto/create-mi-metodo-pago.dto';
import { UpdateMetodoPagoAficionadoDto } from './dto/update-metodo-pago-aficionado.dto';
import {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from './entities/metodo-pago-aficionado.entity';
import type { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';
import { MisMetodosPagoController } from './mis-metodos-pago.controller';

describe('MisMetodosPagoController', () => {
  const userId = 42;
  const aficionadoId = 'aficionado-propio';
  const id = 'registro-propio';
  const metodoPagoId = '550e8400-e29b-41d4-a716-446655440110';
  const dto = { metodo_pago_id: metodoPagoId, referencia: '**** 4242' };
  const registro = Object.assign(new MetodoPagoAficionado(), {
    id,
    aficionado_id: aficionadoId,
    referencia: dto.referencia,
    fecha_registro: new Date('2026-11-01T10:00:00Z'),
    predeterminado: false,
    estado: EstadoMetodoPagoAficionado.ACTIVO,
    metodo_pago: {
      id: metodoPagoId,
      nombre: 'Visa',
      tipo: TipoMetodoPago.TARJETA_CREDITO,
      activo: false,
    } satisfies Partial<MetodoPago>,
    apuestas: [{ id: 'apuesta-privada' }],
  });

  const resolverAficionado = jest.fn<MiAficionadoService['resolverAficionado']>();
  const service = {
    findByAficionado: jest.fn<MetodosPagoAficionadoService['findByAficionado']>(),
    findOwned: jest.fn<MetodosPagoAficionadoService['findOwned']>(),
    create: jest.fn<MetodosPagoAficionadoService['create']>(),
    update: jest.fn<MetodosPagoAficionadoService['update']>(),
    remove: jest.fn<MetodosPagoAficionadoService['remove']>(),
  };
  const controller = new MisMetodosPagoController(
    { resolverAficionado } as unknown as MiAficionadoService,
    service as unknown as MetodosPagoAficionadoService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolverAficionado.mockResolvedValue(
      { id: aficionadoId } as Awaited<ReturnType<typeof resolverAficionado>>,
    );
  });

  it('resolves the owner from the user in the token and creates the registration', async () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MisMetodosPagoController,
      'create',
    ) as Record<string, {
      index: number;
      factory?: (data: unknown, context: ExecutionContext) => number;
    }>;
    const factory = Object.values(args).find((arg) => arg.index === 0)?.factory;
    if (!factory) throw new Error('El controlador debe extraer el usuario del token');
    const claims = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url');
    const tokenUserId = factory(undefined, {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: `Bearer header.${claims}.signature` } }),
      }),
    } as ExecutionContext);
    service.create.mockResolvedValue({ id } as Awaited<ReturnType<typeof service.create>>);
    service.findOwned.mockResolvedValue(registro);

    const result = await controller.create(tokenUserId, dto);

    expect(resolverAficionado).toHaveBeenCalledWith(userId);
    expect(service.create).toHaveBeenCalledWith({ ...dto, aficionado_id: aficionadoId });
    expect(result).toMatchObject({ id, tiene_apuestas: true });
  });

  it('uses the owner from the session and exposes only the fan response fields', async () => {
    service.findByAficionado.mockResolvedValue([registro]);

    await expect(controller.findMine(userId)).resolves.toEqual([{
      id,
      referencia: dto.referencia,
      fecha_registro: registro.fecha_registro,
      predeterminado: false,
      estado: EstadoMetodoPagoAficionado.ACTIVO,
      metodo_pago_id: metodoPagoId,
      metodo_pago_nombre: 'Visa',
      metodo_pago_tipo: TipoMetodoPago.TARJETA_CREDITO,
      tiene_apuestas: true,
    }]);
    expect(service.findByAficionado).toHaveBeenCalledWith(aficionadoId);
  });

  it('does not update or remove someone else’s registration', async () => {
    service.findOwned.mockRejectedValue(new NotFoundException());

    await expect(controller.update(userId, 'ajeno', { predeterminado: true }))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.remove(userId, 'ajeno'))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(service.findOwned).toHaveBeenCalledTimes(2);
    expect(service.findOwned).toHaveBeenCalledWith('ajeno', aficionadoId);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('returns 404 before reading payment registrations if the user is not a fan', async () => {
    resolverAficionado.mockRejectedValue(new NotFoundException('Tu usuario todavía no es aficionado'));

    await expect(controller.findMine(userId)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.findByAficionado).not.toHaveBeenCalled();
  });

  it('rejects extra ownership, state and catalog fields on the respective DTOs', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });

    await expect(pipe.transform(
      { ...dto, aficionado_id: aficionadoId, estado: 'INACTIVO' },
      { type: 'body', metatype: CreateMiMetodoPagoDto },
    )).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform(
      { metodo_pago_id: metodoPagoId },
      { type: 'body', metatype: UpdateMetodoPagoAficionadoDto },
    )).rejects.toBeInstanceOf(BadRequestException);
  });
});
