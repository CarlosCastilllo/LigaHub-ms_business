import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MetodoPagoAficionado } from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { MetodoPago, TipoMetodoPago } from './entities/metodo-pago.entity';
import { MetodosPagoService } from './metodos-pago.service';

describe('MetodosPagoService', () => {
  let service: MetodosPagoService;
  let metodosRepository: jest.Mocked<
    Pick<Repository<MetodoPago>, 'save' | 'find' | 'findOne' | 'remove'>
  >;

  const metodoId = '550e8400-e29b-41d4-a716-446655440110';
  const otroId = '550e8400-e29b-41d4-a716-446655440111';

  function metodoPago(id = metodoId, nombre = 'Nequi'): MetodoPago {
    return Object.assign(new MetodoPago(), {
      id,
      nombre,
      tipo: TipoMetodoPago.BILLETERA_DIGITAL,
      activo: true,
      metodos_pago_aficionado: [],
    });
  }

  function mockTabla(...metodos: MetodoPago[]) {
    metodosRepository.findOne.mockImplementation(async (options) => {
      const where = (options as { where: Partial<MetodoPago> }).where;
      return (
        metodos.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof MetodoPago] === value,
          ),
        ) ?? null
      );
    });
  }

  beforeEach(() => {
    metodosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    metodosRepository.save.mockImplementation(async (entity) =>
      Object.assign(entity as MetodoPago, {
        id: (entity as MetodoPago).id ?? metodoId,
      }),
    );
    service = new MetodosPagoService(
      metodosRepository as unknown as Repository<MetodoPago>,
    );
  });

  it('creates an active metodo de pago by default', async () => {
    mockTabla();

    const result = await service.create({
      nombre: 'Nequi',
      tipo: TipoMetodoPago.BILLETERA_DIGITAL,
    });

    expect(result).toEqual(
      expect.objectContaining({ id: metodoId, nombre: 'Nequi', activo: true }),
    );
  });

  it('rejects a duplicated nombre', async () => {
    mockTabla(metodoPago());

    await expect(
      service.create({ nombre: 'Nequi', tipo: TipoMetodoPago.PSE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(metodosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects renaming to the nombre of another metodo', async () => {
    mockTabla(metodoPago(), metodoPago(otroId, 'Daviplata'));

    await expect(
      service.update(metodoId, { nombre: 'Daviplata' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates a metodo de pago', async () => {
    mockTabla(metodoPago());

    const result = await service.update(metodoId, { activo: false });

    expect(result.activo).toBe(false);
  });

  it('lists metodos with their registrations loaded', async () => {
    metodosRepository.find.mockResolvedValue([metodoPago()]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(metodosRepository.find).toHaveBeenCalledWith({
      relations: { metodos_pago_aficionado: true },
    });
  });

  it('removes a metodo nobody has registered', async () => {
    mockTabla(metodoPago());

    await expect(service.remove(metodoId)).resolves.toEqual({
      message: `MetodoPago #${metodoId} deleted successfully`,
    });
  });

  it('does not remove a metodo registered by aficionados', async () => {
    const item = metodoPago();
    item.metodos_pago_aficionado = [
      Object.assign(new MetodoPagoAficionado(), { id: 'mpa' }),
    ];
    mockTabla(item);

    await expect(service.remove(metodoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(metodosRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 when the metodo does not exist', async () => {
    mockTabla();

    await expect(service.findOne(metodoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
