import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { AficionadoEquipo } from './entities/aficionado-equipo.entity';
import { AficionadoEquipoService } from './aficionado-equipo.service';

describe('AficionadoEquipoService', () => {
  let service: AficionadoEquipoService;
  let relacionesRepository: jest.Mocked<
    Pick<Repository<AficionadoEquipo>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let aficionadosRepository: jest.Mocked<
    Pick<Repository<Aficionado>, 'findOne'>
  >;
  let equiposRepository: jest.Mocked<Pick<Repository<Equipo>, 'findOne'>>;
  const aficionadoId = '550e8400-e29b-41d4-a716-446655440240';
  const equipoId = '550e8400-e29b-41d4-a716-446655440220';

  function relacion(): AficionadoEquipo {
    return Object.assign(new AficionadoEquipo(), {
      id: '550e8400-e29b-41d4-a716-446655440241',
      aficionado: Object.assign(new Aficionado(), { id: aficionadoId }),
      equipo: Object.assign(new Equipo(), { id: equipoId, nombre: 'Tigres' }),
    });
  }

  beforeEach(() => {
    relacionesRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    aficionadosRepository = { findOne: jest.fn() };
    equiposRepository = { findOne: jest.fn() };
    relacionesRepository.save.mockImplementation(
      async (entity) => entity as AficionadoEquipo,
    );
    aficionadosRepository.findOne.mockResolvedValue(relacion().aficionado);
    equiposRepository.findOne.mockResolvedValue(relacion().equipo);
    relacionesRepository.findOne.mockResolvedValue(null);
    service = new AficionadoEquipoService(
      relacionesRepository as unknown as Repository<AficionadoEquipo>,
      aficionadosRepository as unknown as Repository<Aficionado>,
      equiposRepository as unknown as Repository<Equipo>,
    );
  });

  it('creates a team preference for an aficionado', async () => {
    await expect(
      service.create({ aficionado_id: aficionadoId, equipo_id: equipoId }),
    ).resolves.toEqual({
      id: undefined,
      aficionado_id: aficionadoId,
      equipo_id: equipoId,
    });
  });

  it('rejects a duplicate team preference', async () => {
    relacionesRepository.findOne.mockResolvedValue(relacion());

    await expect(
      service.create({ aficionado_id: aficionadoId, equipo_id: equipoId }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(relacionesRepository.save).not.toHaveBeenCalled();
  });

  it('allows updating a preference without treating itself as duplicate', async () => {
    const item = relacion();
    relacionesRepository.findOne
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(item);

    await expect(
      service.update(item.id, { equipo_id: equipoId }),
    ).resolves.toEqual({
      id: item.id,
      aficionado_id: aficionadoId,
      equipo_id: equipoId,
    });
  });
});
