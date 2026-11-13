import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Apuesta } from '../apuestas/entities/apuesta.entity';
import {
  MetodoPago,
  TipoMetodoPago,
} from '../metodos-pago/entities/metodo-pago.entity';
import { CreateMetodoPagoAficionadoDto } from './dto/create-metodo-pago-aficionado.dto';
import {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from './entities/metodo-pago-aficionado.entity';
import { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';

describe('MetodosPagoAficionadoService', () => {
  let service: MetodosPagoAficionadoService;
  let mpaRepository: jest.Mocked<
    Pick<
      Repository<MetodoPagoAficionado>,
      'save' | 'find' | 'findOne' | 'remove'
    >
  >;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'findOne'>
  >;
  let metodosPagoRepository: jest.Mocked<
    Pick<Repository<MetodoPago>, 'findOne'>
  >;

  const aficionadoId = '550e8400-e29b-41d4-a716-446655440080';
  const metodoPagoId = '550e8400-e29b-41d4-a716-446655440110';
  const mpaId = '550e8400-e29b-41d4-a716-446655440100';
  const otroMpaId = '550e8400-e29b-41d4-a716-446655440101';

  function aficionado(): Aficionado {
    return Object.assign(new Aficionado(), { id: aficionadoId });
  }

  function metodoPago(activo = true): MetodoPago {
    return Object.assign(new MetodoPago(), {
      id: metodoPagoId,
      nombre: 'Visa',
      tipo: TipoMetodoPago.TARJETA_CREDITO,
      activo,
    });
  }

  function registro(id = mpaId, predeterminado = false): MetodoPagoAficionado {
    return Object.assign(new MetodoPagoAficionado(), {
      id,
      referencia: '**** 4242',
      fecha_registro: new Date('2026-11-01T10:00:00Z'),
      predeterminado,
      estado: EstadoMetodoPagoAficionado.ACTIVO,
      aficionado: aficionado(),
      metodo_pago: metodoPago(),
      apuestas: [],
    });
  }

  const createDto: CreateMetodoPagoAficionadoDto = {
    referencia: '**** 4242',
    aficionado_id: aficionadoId,
    metodo_pago_id: metodoPagoId,
  };

  beforeEach(() => {
    mpaRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    aficionadosRepository = { findOne: jest.fn() };
    metodosPagoRepository = { findOne: jest.fn() };
    mpaRepository.save.mockImplementation(async (entity) => entity as never);
    mpaRepository.find.mockResolvedValue([]);
    service = new MetodosPagoAficionadoService(
      mpaRepository as unknown as Repository<MetodoPagoAficionado>,
      aficionadosRepository as unknown as Repository<Aficionado>,
      metodosPagoRepository as unknown as Repository<MetodoPago>,
    );
  });

  it('registers an active metodo de pago for an aficionado', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    metodosPagoRepository.findOne.mockResolvedValue(metodoPago());

    const result = await service.create(createDto);

    expect(result).toEqual(
      expect.objectContaining({
        referencia: '**** 4242',
        predeterminado: false,
        estado: EstadoMetodoPagoAficionado.ACTIVO,
        aficionado_id: aficionadoId,
        metodo_pago_id: metodoPagoId,
      }),
    );
  });

  it('rejects registering an inactive metodo de pago', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    metodosPagoRepository.findOne.mockResolvedValue(metodoPago(false));

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mpaRepository.save).not.toHaveBeenCalled();
  });

  it('returns 404 when the aficionado does not exist', async () => {
    aficionadosRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 when the metodo de pago does not exist', async () => {
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    metodosPagoRepository.findOne.mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('unmarks the previous default metodo when registering a new default', async () => {
    const anterior = registro(otroMpaId, true);
    aficionadosRepository.findOne.mockResolvedValue(aficionado());
    metodosPagoRepository.findOne.mockResolvedValue(metodoPago());
    mpaRepository.find.mockResolvedValue([anterior]);

    const result = await service.create({
      referencia: '**** 4242',
      aficionado_id: aficionadoId,
      metodo_pago_id: metodoPagoId,
      predeterminado: true,
    });

    expect(anterior.predeterminado).toBe(false);
    expect(mpaRepository.save).toHaveBeenCalledWith([anterior]);
    expect(result.predeterminado).toBe(true);
  });

  it('marks an existing registration as default and unmarks the others', async () => {
    const actual = registro(mpaId, false);
    const anterior = registro(otroMpaId, true);
    mpaRepository.findOne.mockResolvedValue(actual);
    mpaRepository.find.mockResolvedValue([anterior, actual]);

    const result = await service.update(mpaId, { predeterminado: true });

    expect(anterior.predeterminado).toBe(false);
    expect(result.predeterminado).toBe(true);
  });

  it('deactivates a registration', async () => {
    mpaRepository.findOne.mockResolvedValue(registro());

    const result = await service.update(mpaId, {
      estado: EstadoMetodoPagoAficionado.INACTIVO,
    });

    expect(result.estado).toBe(EstadoMetodoPagoAficionado.INACTIVO);
  });

  it('does not remove a registration used to pay apuestas', async () => {
    const item = registro();
    item.apuestas = [Object.assign(new Apuesta(), { id: 'apuesta' })];
    mpaRepository.findOne.mockResolvedValue(item);

    await expect(service.remove(mpaId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mpaRepository.remove).not.toHaveBeenCalled();
  });

  it('removes a registration without apuestas', async () => {
    mpaRepository.findOne.mockResolvedValue(registro());

    await expect(service.remove(mpaId)).resolves.toEqual({
      message: `MetodoPagoAficionado #${mpaId} deleted successfully`,
    });
  });

  it('returns 404 when the registration does not exist', async () => {
    mpaRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(mpaId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('CreateMetodoPagoAficionadoDto.referencia', () => {
    async function errores(referencia: string) {
      const dto = plainToInstance(CreateMetodoPagoAficionadoDto, {
        referencia,
        aficionado_id: aficionadoId,
        metodo_pago_id: metodoPagoId,
      });
      return (await validate(dto)).map((error) => error.property);
    }

    it.each(['**** 4242', '***-***-4567', 'Nequi ***1234'])(
      'accepts the masked reference "%s"',
      async (referencia) => {
        await expect(errores(referencia)).resolves.toEqual([]);
      },
    );

    it.each(['4242424242424242', '3001234567'])(
      'rejects the unmasked number "%s"',
      async (referencia) => {
        await expect(errores(referencia)).resolves.toContain('referencia');
      },
    );
  });
});
