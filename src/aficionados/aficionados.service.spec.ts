import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Apuesta } from '../apuestas/entities/apuesta.entity';
import { Boleta } from '../boletas/entities/boleta.entity';
import { MetodoPagoAficionado } from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { AficionadosService } from './aficionados.service';
import { Aficionado } from './entities/aficionado.entity';

describe('AficionadosService', () => {
  let service: AficionadosService;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'save' | 'find' | 'findOne' | 'remove'>
  >;

  const aficionadoId = '550e8400-e29b-41d4-a716-446655440080';
  const otroId = '550e8400-e29b-41d4-a716-446655440081';
  const relations = {
    boletas: true,
    apuestas: true,
    metodos_pago_aficionado: true,
  };

  function aficionado(id = aficionadoId): Aficionado {
    return Object.assign(new Aficionado(), {
      id,
      nombre: 'Ana Gomez',
      documento: '1053000111',
      email: 'ana@example.com',
      telefono: '3001234567',
      boletas: [],
      apuestas: [],
      metodos_pago_aficionado: [],
    });
  }

  // Simula la tabla: busca por id, documento o email segun el where.
  function mockTabla(...aficionados: Aficionado[]) {
    aficionadosRepository.findOne.mockImplementation(async (options) => {
      const where = (options as { where: Partial<Aficionado> }).where;
      return (
        aficionados.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof Aficionado] === value,
          ),
        ) ?? null
      );
    });
  }

  beforeEach(() => {
    aficionadosRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    aficionadosRepository.save.mockImplementation(async (entity) =>
      Object.assign(entity as Aficionado, {
        id: (entity as Aficionado).id ?? aficionadoId,
      }),
    );
    service = new AficionadosService(
      aficionadosRepository as unknown as Repository<Aficionado>,
    );
  });

  it('creates an aficionado with unique documento and email', async () => {
    mockTabla();

    const result = await service.create({
      nombre: 'Ana Gomez',
      documento: '1053000111',
      email: 'ana@example.com',
    });

    expect(result).toEqual(
      expect.objectContaining({ id: aficionadoId, telefono: null }),
    );
  });

  it('rejects a duplicated documento', async () => {
    mockTabla(aficionado());

    await expect(
      service.create({
        nombre: 'Otro',
        documento: '1053000111',
        email: 'otro@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(aficionadosRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a duplicated email', async () => {
    mockTabla(aficionado());

    await expect(
      service.create({
        nombre: 'Otro',
        documento: '999',
        email: 'ana@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows an update that keeps its own documento and email', async () => {
    mockTabla(aficionado());

    const result = await service.update(aficionadoId, {
      documento: '1053000111',
      email: 'ana@example.com',
      nombre: 'Ana Maria Gomez',
    });

    expect(result.nombre).toBe('Ana Maria Gomez');
  });

  it('rejects an update that takes the email of another aficionado', async () => {
    const otro = aficionado(otroId);
    otro.documento = '222';
    otro.email = 'otro@example.com';
    mockTabla(aficionado(), otro);

    await expect(
      service.update(aficionadoId, { email: 'otro@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(aficionadosRepository.save).not.toHaveBeenCalled();
  });

  it('lists aficionados with boletas and apuestas loaded', async () => {
    aficionadosRepository.find.mockResolvedValue([aficionado()]);

    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(aficionadosRepository.find).toHaveBeenCalledWith({ relations });
  });

  it('removes an aficionado without boletas or apuestas', async () => {
    mockTabla(aficionado());

    await expect(service.remove(aficionadoId)).resolves.toEqual({
      message: `Aficionado #${aficionadoId} deleted successfully`,
    });
  });

  it('does not remove an aficionado with boletas', async () => {
    const item = aficionado();
    item.boletas = [Object.assign(new Boleta(), { id: 'boleta' })];
    mockTabla(item);

    await expect(service.remove(aficionadoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(aficionadosRepository.remove).not.toHaveBeenCalled();
  });

  it('does not remove an aficionado with apuestas', async () => {
    const item = aficionado();
    item.apuestas = [Object.assign(new Apuesta(), { id: 'apuesta' })];
    mockTabla(item);

    await expect(service.remove(aficionadoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not remove an aficionado with registered metodos de pago', async () => {
    const item = aficionado();
    item.metodos_pago_aficionado = [
      Object.assign(new MetodoPagoAficionado(), { id: 'mpa' }),
    ];
    mockTabla(item);

    await expect(service.remove(aficionadoId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(aficionadosRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 when the aficionado does not exist', async () => {
    mockTabla();

    await expect(service.findOne(aficionadoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
