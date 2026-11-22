import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AficionadoEquipo } from '../../aficionado-equipo/entities/aficionado-equipo.entity';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Aficionado } from '../entities/aficionado.entity';
import { MiAficionadoService } from './mi-aficionado.service';

describe('MiAficionadoService', () => {
  const userId = 7;
  const tigres = Object.assign(new Equipo(), {
    id: '550e8400-e29b-41d4-a716-446655440220',
    nombre: 'Tigres',
    activo: true,
  });
  const leones = Object.assign(new Equipo(), {
    id: '550e8400-e29b-41d4-a716-446655440221',
    nombre: 'Leones',
    activo: false,
  });
  const datos = {
    nombre: 'Ana Ruiz',
    documento: '1001',
    email: 'ana@liga.test',
  };

  let service: MiAficionadoService;
  let manager: { save: jest.Mock<(entity: unknown) => Promise<unknown>> };
  let aficionados: {
    findOne: jest.Mock<(options: unknown) => Promise<Aficionado | null>>;
    manager: { transaction: jest.Mock };
  };
  let relaciones: {
    find: jest.Mock<(options: unknown) => Promise<AficionadoEquipo[]>>;
    findOne: jest.Mock<(options: unknown) => Promise<AficionadoEquipo | null>>;
    save: jest.Mock<(entity: AficionadoEquipo) => Promise<AficionadoEquipo>>;
    remove: jest.Mock<(entity: AficionadoEquipo) => Promise<AficionadoEquipo>>;
  };
  let equipos: { find: jest.Mock<(options: unknown) => Promise<Equipo[]>> };

  const aficionado = () =>
    Object.assign(new Aficionado(), {
      id: '550e8400-e29b-41d4-a716-446655440240',
      user_id: userId,
      telefono: null,
      ...datos,
    });

  beforeEach(() => {
    manager = {
      save: jest.fn(async (entity: unknown) =>
        Array.isArray(entity)
          ? entity.map((item, index) => Object.assign(item, { id: `rel-${index}` }))
          : Object.assign(entity as object, { id: 'afi-1' }),
      ),
    };
    aficionados = {
      findOne: jest.fn(async () => null),
      manager: {
        transaction: jest.fn(async (work: unknown) =>
          (work as (m: typeof manager) => Promise<unknown>)(manager),
        ),
      },
    };
    relaciones = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      save: jest.fn(async (entity) => Object.assign(entity, { id: 'rel-9' })),
      remove: jest.fn(async (entity) => entity),
    };
    equipos = {
      find: jest.fn(async () => [tigres, leones]),
    };
    service = new MiAficionadoService(
      aficionados as unknown as Repository<Aficionado>,
      relaciones as unknown as Repository<AficionadoEquipo>,
      equipos as unknown as Repository<Equipo>,
    );
  });

  it('converts the user into an aficionado with the chosen equipos', async () => {
    equipos.find.mockResolvedValue([tigres]);

    const result = await service.convertirse(userId, {
      ...datos,
      equipo_ids: [tigres.id],
    });

    expect(result).toEqual(
      expect.objectContaining({
        user_id: userId,
        nombre: 'Ana Ruiz',
        equipos: [
          { asociacion_id: 'rel-0', equipo_id: tigres.id, nombre: 'Tigres', activo: true },
        ],
      }),
    );
    expect(aficionados.manager.transaction).toHaveBeenCalled();
  });

  it('does not let a user become aficionado twice', async () => {
    aficionados.findOne.mockResolvedValueOnce(aficionado());

    await expect(service.convertirse(userId, datos)).rejects.toThrow(
      new ConflictException('Tu usuario ya está registrado como aficionado'),
    );
    expect(aficionados.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects equipos that are not registered or not active', async () => {
    equipos.find.mockResolvedValue([leones]);
    await expect(
      service.convertirse(userId, { ...datos, equipo_ids: [leones.id] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    equipos.find.mockResolvedValue([]);
    await expect(
      service.convertirse(userId, { ...datos, equipo_ids: [tigres.id] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aficionados.manager.transaction).not.toHaveBeenCalled();
  });

  it('answers 404 when the user is not an aficionado yet', async () => {
    await expect(service.findMine(userId)).rejects.toThrow(
      new NotFoundException('Tu usuario todavía no es aficionado'),
    );
  });

  it('rejects following the same equipo twice', async () => {
    aficionados.findOne.mockResolvedValue(aficionado());
    equipos.find.mockResolvedValue([tigres]);
    relaciones.findOne.mockResolvedValue(new AficionadoEquipo());

    await expect(
      service.asociarEquipo(userId, { equipo_id: tigres.id }),
    ).rejects.toThrow(new ConflictException('Ya sigues al equipo "Tigres"'));
    expect(relaciones.save).not.toHaveBeenCalled();
  });

  it('only searches the associations of the aficionado from the token', async () => {
    aficionados.findOne.mockResolvedValue(aficionado());
    equipos.find.mockResolvedValue([tigres]);

    await service.asociarEquipo(userId, { equipo_id: tigres.id });

    expect(aficionados.findOne).toHaveBeenCalledWith({ where: { user_id: userId } });
    expect(relaciones.save).toHaveBeenCalled();
  });

  it('withdraws only the association, keeping aficionado and equipo', async () => {
    aficionados.findOne.mockResolvedValue(aficionado());
    const relacion = Object.assign(new AficionadoEquipo(), { id: 'rel-1', equipo: tigres });
    relaciones.findOne.mockResolvedValue(relacion);

    await expect(service.retirarEquipo(userId, tigres.id)).resolves.toEqual({
      message: 'Dejaste de seguir al equipo "Tigres"',
    });
    expect(relaciones.remove).toHaveBeenCalledWith(relacion);
  });

  it('answers 404 when withdrawing an equipo the aficionado does not follow', async () => {
    aficionados.findOne.mockResolvedValue(aficionado());

    await expect(service.retirarEquipo(userId, tigres.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(relaciones.remove).not.toHaveBeenCalled();
  });

  it('lists only active equipos as available', async () => {
    equipos.find.mockResolvedValue([tigres]);

    await expect(service.findEquiposDisponibles()).resolves.toEqual([
      { id: tigres.id, nombre: 'Tigres' },
    ]);
    expect(equipos.find).toHaveBeenCalledWith({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  });
});
