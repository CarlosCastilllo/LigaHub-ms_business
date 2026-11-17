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
      new ConflictException('A jugador for user 7 already exists'),
    );
    expect(securityUsers.assertUserExists).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('turns a concurrent duplicate insert into a 409', async () => {
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: 'ER_DUP_ENTRY' } as never),
    );

    await expect(service.create(dto, authorization)).rejects.toThrow(
      new ConflictException('A jugador for user 7 already exists'),
    );
  });

  it('does not save when the user does not exist', async () => {
    securityUsers.assertUserExists.mockRejectedValue(
      new NotFoundException('User with id 7 not found'),
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

  it('prevents removing a jugador with dependent records', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), { equipos_jugador: [{}] }),
    );

    await expect(service.remove(jugadorId)).rejects.toThrow(
      new ConflictException(
        `Jugador #${jugadorId} has anotaciones, posiciones espaciales, equipo history or habilidades; delete or reassign them first, or deactivate it instead`,
      ),
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('prevents removing a jugador assigned to habilidades', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(jugador(), { habilidades_jugador: [{}] }),
    );

    await expect(service.remove(jugadorId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('removes a jugador without dependent records', async () => {
    repository.findOne.mockResolvedValue(jugador());

    await expect(service.remove(jugadorId)).resolves.toEqual({
      message: `Jugador #${jugadorId} deleted successfully`,
    });
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });
});
