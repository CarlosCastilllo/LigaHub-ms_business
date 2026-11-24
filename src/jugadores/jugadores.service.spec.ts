import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Jugador } from './entities/jugador.entity';
import { JugadoresService } from './jugadores.service';

describe('JugadoresService', () => {
  let service: JugadoresService;
  let repository: jest.Mocked<
    Pick<Repository<Jugador>, 'save' | 'find' | 'findOne' | 'remove'>
  >;
  let securityUsers: { assertUserExists: jest.Mock<SecurityUsersClient['assertUserExists']> };
  const jugadorId = '550e8400-e29b-41d4-a716-446655440200';
  const authorization = 'Bearer token-admin';
  const dto = {
    user_id: 7,
    fecha_nacimiento: '1989-07-02',
    nacionalidad: 'Estadounidense',
  };

  function jugador(): Jugador {
    return Object.assign(new Jugador(), { id: jugadorId, activo: true, ...dto });
  }

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    repository.save.mockImplementation(async (entity) => entity as Jugador);
    repository.findOne.mockResolvedValue(null);
    securityUsers = { assertUserExists: jest.fn() };
    securityUsers.assertUserExists.mockResolvedValue(undefined);
    service = new JugadoresService(
      repository as unknown as Repository<Jugador>,
      securityUsers as unknown as SecurityUsersClient,
    );
  });

  it('creates a jugador linked to an existing user', async () => {
    await expect(service.create(dto, authorization)).resolves.toEqual(
      expect.objectContaining({ ...dto, activo: true }),
    );
    expect(securityUsers.assertUserExists).toHaveBeenCalledWith(7, authorization);
  });

  it('rejects a second jugador for the same user before calling ms-security', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(service.create(dto, authorization)).rejects.toThrow(
      new ConflictException(
        'Ya existe un jugador asociado al usuario seleccionado',
      ),
    );
    expect(securityUsers.assertUserExists).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('turns a concurrent duplicate insert into a 409', async () => {
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: 'ER_DUP_ENTRY' } as never),
    );

    await expect(service.create(dto, authorization)).rejects.toThrow(
      new ConflictException(
        'Ya existe un jugador asociado al usuario seleccionado',
      ),
    );
  });

  it('does not save when the user does not exist', async () => {
    securityUsers.assertUserExists.mockRejectedValue(
      new NotFoundException('El usuario seleccionado no fue encontrado'),
    );

    await expect(service.create(dto, authorization)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not save when ms-security is unavailable', async () => {
    securityUsers.assertUserExists.mockRejectedValue(
      new ServiceUnavailableException('Servicio de seguridad no disponible'),
    );

    await expect(service.create(dto, authorization)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a future birth date on create and update', async () => {
    await expect(
      service.create({ ...dto, fecha_nacimiento: '2999-01-01' }, authorization),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findOne.mockResolvedValue(jugador());
    await expect(
      service.update(jugadorId, { fecha_nacimiento: '2999-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  describe('minimum age of 14 years', () => {
    beforeEach(() => {
      jest.useFakeTimers({
        now: new Date('2026-06-15T12:00:00Z'),
        doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const menorDeEdad = new BadRequestException(
      'El jugador debe tener al menos 14 años',
    );

    it('rejects registering a jugador one day short of 14 years', async () => {
      await expect(
        service.create({ ...dto, fecha_nacimiento: '2012-06-16' }, authorization),
      ).rejects.toThrow(menorDeEdad);
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(securityUsers.assertUserExists).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('registers a jugador who turns 14 today', async () => {
      await expect(
        service.create({ ...dto, fecha_nacimiento: '2012-06-15' }, authorization),
      ).resolves.toEqual(
        expect.objectContaining({ fecha_nacimiento: '2012-06-15' }),
      );
    });

    it('rejects changing the birth date to one under 14 years on update', async () => {
      repository.findOne.mockResolvedValue(jugador());

      await expect(
        service.update(jugadorId, { fecha_nacimiento: '2013-01-01' }),
      ).rejects.toThrow(menorDeEdad);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('allows editing other fields when the stored birth date is unchanged', async () => {
      repository.findOne.mockResolvedValue(
        Object.assign(jugador(), { fecha_nacimiento: '2015-03-01' }),
      );

      await expect(
        service.update(jugadorId, {
          fecha_nacimiento: '2015-03-01',
          nacionalidad: 'Chilena',
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          fecha_nacimiento: '2015-03-01',
          nacionalidad: 'Chilena',
        }),
      );
    });
  });

  it('updates an existing jugador keeping the other fields', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(
      service.update(jugadorId, { nacionalidad: 'Canadiense' }),
    ).resolves.toEqual({
      id: jugadorId,
      user_id: 7,
      fecha_nacimiento: '1989-07-02',
      nacionalidad: 'Canadiense',
      activo: true,
    });
  });

  it('deactivates a jugador', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(service.update(jugadorId, { activo: false })).resolves.toEqual(
      expect.objectContaining({ activo: false, nacionalidad: 'Estadounidense' }),
    );
  });

  it('returns 404 for a missing jugador', async () => {
    await expect(service.findOne(jugadorId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the deportivo profile with teams and habilidades', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), {
        equipos_jugador: [
          {
            id: '550e8400-e29b-41d4-a716-446655440201',
            equipo_id: '550e8400-e29b-41d4-a716-446655440202',
            equipo: {
              id: '550e8400-e29b-41d4-a716-446655440202',
              nombre: 'Tigres',
              fase_grupos_id: null,
              activo: true,
            },
            fecha_inicio: '2026-01-01',
            fecha_fin: null,
            activo: true,
          },
        ],
        habilidades_jugador: [
          {
            id: '550e8400-e29b-41d4-a716-446655440203',
            habilidad_id: '550e8400-e29b-41d4-a716-446655440204',
            habilidad: {
              id: '550e8400-e29b-41d4-a716-446655440204',
              nombre: 'Velocidad',
              descripcion: 'Rapidez en carrera',
            },
          },
        ],
      }),
    );

    await expect(service.findPerfil(jugadorId)).resolves.toEqual({
      jugador: expect.objectContaining({
        id: jugadorId,
        nacionalidad: 'Estadounidense',
      }),
      equipos: [
        expect.objectContaining({
          equipo_id: '550e8400-e29b-41d4-a716-446655440202',
          nombre: 'Tigres',
          fecha_inicio: '2026-01-01',
          fecha_fin: null,
          activo: true,
        }),
      ],
      habilidades: [
        expect.objectContaining({
          habilidad_id: '550e8400-e29b-41d4-a716-446655440204',
          habilidad: expect.objectContaining({ nombre: 'Velocidad' }),
        }),
      ],
    });
  });

  it('returns empty lists in the profile when the jugador has no associations', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), {
        equipos_jugador: [],
        habilidades_jugador: [],
      }),
    );

    await expect(service.findPerfil(jugadorId)).resolves.toEqual({
      jugador: expect.objectContaining({ id: jugadorId }),
      equipos: [],
      habilidades: [],
    });
  });

  describe('remove', () => {
    let manager: { remove: jest.Mock<(entity: unknown) => Promise<unknown>> };

    beforeEach(() => {
      manager = { remove: jest.fn() };
      manager.remove.mockImplementation(async (entity) => entity);
      Object.assign(repository, {
        manager: {
          transaction: jest.fn(
            async (work: (m: typeof manager) => Promise<unknown>) => work(manager),
          ),
        },
      });
    });

    it('removes a jugador without dependent records', async () => {
      repository.findOne.mockResolvedValue(jugador());

      await expect(service.remove(jugadorId)).resolves.toEqual({
        message: 'Se eliminó el jugador asociado al usuario 7 correctamente',
      });
      expect(manager.remove).toHaveBeenCalledTimes(1);
      expect(manager.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: jugadorId }),
      );
    });

    it('removes a jugador with retired team history and assigned habilidades, keeping the habilidades catalog', async () => {
      const historial = [
        { id: 'ej-1', activo: false, equipo: { nombre: 'Equipo Prueba' } },
      ];
      const habilidades = [
        { id: 'hj-1', habilidad_id: 'h-1', habilidad: { id: 'h-1' } },
      ];
      repository.findOne.mockResolvedValue(
        Object.assign(jugador(), {
          equipos_jugador: historial,
          habilidades_jugador: habilidades,
        }),
      );

      await expect(service.remove(jugadorId)).resolves.toEqual({
        message: 'Se eliminó el jugador asociado al usuario 7 correctamente',
      });
      expect(manager.remove.mock.calls.map(([entity]) => entity)).toEqual([
        historial,
        habilidades,
        expect.objectContaining({ id: jugadorId }),
      ]);
    });

    it('prevents removing a jugador with an active team contract', async () => {
      repository.findOne.mockResolvedValue(
        Object.assign(jugador(), {
          equipos_jugador: [
            { activo: false, equipo: { nombre: 'Viejo FC' } },
            { activo: true, equipo: { nombre: 'Equipo Prueba' } },
          ],
        }),
      );

      await expect(service.remove(jugadorId)).rejects.toThrow(
        new ConflictException(
          'No se puede eliminar el jugador asociado al usuario 7 porque tiene un contrato activo con el equipo "Equipo Prueba". Retírelo del equipo antes de eliminarlo',
        ),
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });

    it('prevents removing a jugador with anotaciones or posiciones espaciales, naming them', async () => {
      repository.findOne.mockResolvedValue(
        Object.assign(jugador(), {
          anotaciones: [{}, {}, {}],
          posiciones_espaciales: [{}],
        }),
      );

      await expect(service.remove(jugadorId)).rejects.toThrow(
        new ConflictException(
          'No se puede eliminar el jugador asociado al usuario 7 porque tiene registros de partidos (3 anotaciones y 1 posición espacial). Desactívelo en su lugar',
        ),
      );

      repository.findOne.mockResolvedValue(
        Object.assign(jugador(), { anotaciones: [{}] }),
      );
      await expect(service.remove(jugadorId)).rejects.toThrow(
        new ConflictException(
          'No se puede eliminar el jugador asociado al usuario 7 porque tiene registros de partidos (1 anotación). Desactívelo en su lugar',
        ),
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });

    it('turns a foreign key rejection during the deletion into a 409', async () => {
      repository.findOne.mockResolvedValue(jugador());
      manager.remove.mockRejectedValue(
        new QueryFailedError('DELETE', [], {
          code: 'ER_ROW_IS_REFERENCED_2',
        } as never),
      );

      await expect(service.remove(jugadorId)).rejects.toThrow(
        new ConflictException(
          'No se pudo eliminar el jugador asociado al usuario 7 porque se registraron nuevos datos relacionados. Intente de nuevo',
        ),
      );
    });
  });
});
