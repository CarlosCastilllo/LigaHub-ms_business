import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Anotacion } from '../anotaciones/entities/anotacion.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { NotificationsClient } from '../common/notifications/notifications.client';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Fase } from '../fases/entities/fase.entity';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Partido } from './entities/partido.entity';
import { PartidoNotificacionesService } from './partido-notificaciones.service';

describe('PartidoNotificacionesService', () => {
  let service: PartidoNotificacionesService;
  let securityUsers: { findUserContact: jest.Mock<any> };
  let notifications: {
    enviarNuevoPartido: jest.Mock<any>;
    enviarGol: jest.Mock<any>;
    enviarResumenPartido: jest.Mock<any>;
  };
  let partidosRepository: { findOne: jest.Mock<any> };

  const partido = Object.assign(new Partido(), {
    id: 'partido-nuevo',
    fecha_hora: new Date('2026-12-05T20:00:00-05:00'),
    equipo_local: Object.assign(new Equipo(), { id: 'eq-1', nombre: 'Once Caldas' }),
    equipo_visitante: Object.assign(new Equipo(), { id: 'eq-2', nombre: 'Manizales FC' }),
    escenario: Object.assign(new Escenario(), {
      nombre: 'Estadio Palogrande',
      direccion: 'Cra 23',
    }),
  });
  const fase = Object.assign(new Fase(), {
    numero_orden: 1,
    torneo: Object.assign(new Torneo(), { nombre: 'Copa Caldas' }),
    grupos: Object.assign(new FaseGrupos(), { nombre: 'Grupo A' }),
    final: null,
  });

  function aficionado(cambios: Partial<Aficionado>): Aficionado {
    return Object.assign(new Aficionado(), {
      id: 'af',
      nombre: 'Ana',
      email: 'ana@negocio.com',
      user_id: null,
      ...cambios,
    });
  }

  beforeEach(() => {
    securityUsers = { findUserContact: jest.fn<any>() };
    notifications = {
      enviarNuevoPartido: jest.fn<any>().mockResolvedValue(2),
      enviarGol: jest.fn<any>().mockResolvedValue(1),
      enviarResumenPartido: jest.fn<any>().mockResolvedValue(1),
    };
    partidosRepository = { findOne: jest.fn<any>() };
    service = new PartidoNotificacionesService(
      {} as Repository<Aficionado>,
      partidosRepository as unknown as Repository<Partido>,
      securityUsers as unknown as SecurityUsersClient,
      notifications as unknown as NotificationsClient,
    );
  });

  it('usa el correo de security y, si no hay, el del aficionado', async () => {
    jest.spyOn(service, 'findAficionadosDeEquipos').mockResolvedValue([
      aficionado({ id: 'a1', nombre: 'Ana', user_id: 7, email: 'vieja@x.com' }),
      aficionado({ id: 'a2', nombre: 'Luis', user_id: null, email: 'luis@x.com' }),
    ]);
    securityUsers.findUserContact.mockResolvedValue({
      email: 'ana@security.com',
      name: 'Ana S.',
    });

    await service.notificarNuevoPartido(partido, fase, 'Bearer t');

    expect(securityUsers.findUserContact).toHaveBeenCalledWith(7, 'Bearer t');
    expect(notifications.enviarNuevoPartido).toHaveBeenCalledWith(
      [
        { email: 'ana@security.com', nombre: 'Ana' },
        { email: 'luis@x.com', nombre: 'Luis' },
      ],
      {
        equipo_local: 'Once Caldas',
        equipo_visitante: 'Manizales FC',
        fecha_hora: '2026-12-06T01:00:00.000Z',
        torneo: 'Copa Caldas',
        fase: 'Grupo A',
        escenario: 'Estadio Palogrande',
        direccion: 'Cra 23',
      },
    );
  });

  it('cae al correo del aficionado si security no responde', async () => {
    jest
      .spyOn(service, 'findAficionadosDeEquipos')
      .mockResolvedValue([aficionado({ user_id: 9 })]);
    securityUsers.findUserContact.mockResolvedValue(null);

    await service.notificarNuevoPartido(partido, fase);

    expect(notifications.enviarNuevoPartido).toHaveBeenCalledWith(
      [{ email: 'ana@negocio.com', nombre: 'Ana' }],
      expect.anything(),
    );
  });

  it('no repite correos y no envía nada si no hay aficionados', async () => {
    const spy = jest.spyOn(service, 'findAficionadosDeEquipos');
    spy.mockResolvedValue([
      aficionado({ id: 'a1', email: 'Ana@X.com' }),
      aficionado({ id: 'a2', email: 'ana@x.com' }),
    ]);
    await service.notificarNuevoPartido(partido, fase);
    expect(
      (notifications.enviarNuevoPartido.mock.calls[0] as unknown[])[0],
    ).toHaveLength(1);

    notifications.enviarNuevoPartido.mockClear();
    spy.mockResolvedValue([]);
    await expect(service.notificarNuevoPartido(partido, fase)).resolves.toBe(0);
    expect(notifications.enviarNuevoPartido).not.toHaveBeenCalled();
  });

  describe('HU-GC-07: gol y resumen', () => {
    function golDe(id: string, equipoId: string, minuto: number, userId: number) {
      return Object.assign(new Anotacion(), {
        id,
        minuto,
        equipo_id: equipoId,
        jugador: Object.assign(new Jugador(), { id: `j-${userId}`, user_id: userId }),
      });
    }

    const partidoJugado = () =>
      Object.assign(new Partido(), {
        ...partido,
        fase,
        anotaciones: [
          golDe('g2', 'eq-2', 60, 21),
          golDe('g1', 'eq-1', 15, 20),
          golDe('g3', 'eq-1', 88, 20),
        ],
      });

    beforeEach(() => {
      partidosRepository.findOne.mockResolvedValue(partidoJugado());
      jest
        .spyOn(service, 'findAficionadosDelPartido')
        .mockResolvedValue([aficionado({ id: 'a1', email: 'fan@x.com', nombre: 'Fan' })]);
      securityUsers.findUserContact.mockImplementation(async (userId: number) =>
        userId === 20 ? { email: 'p@x.com', name: 'Pedro Gol' } : null,
      );
    });

    it('envía el gol con el marcador actualizado y el nombre del goleador', async () => {
      await expect(service.notificarGol('partido-nuevo', 'g1', 'Bearer t')).resolves.toBe(1);

      expect(service.findAficionadosDelPartido).toHaveBeenCalledWith('partido-nuevo');
      expect(notifications.enviarGol).toHaveBeenCalledWith(
        [{ email: 'fan@x.com', nombre: 'Fan' }],
        {
          equipo_local: 'Once Caldas',
          equipo_visitante: 'Manizales FC',
          goles_local: 2,
          goles_visitante: 1,
          torneo: 'Copa Caldas',
          fase: 'Grupo A',
        },
        { jugador: 'Pedro Gol', equipo: 'Once Caldas', minuto: 15 },
      );
    });

    it('envía el resumen con los goles ordenados por minuto', async () => {
      await service.notificarResumen('partido-nuevo');

      const [, resumen, goles] = notifications.enviarResumenPartido.mock.calls[0] as unknown[];
      expect(resumen).toEqual(
        expect.objectContaining({
          goles_local: 2,
          goles_visitante: 1,
          fecha_hora: '2026-12-06T01:00:00.000Z',
          escenario: 'Estadio Palogrande',
        }),
      );
      expect(goles).toEqual([
        { jugador: 'Pedro Gol', equipo: 'Once Caldas', minuto: 15 },
        { jugador: 'Jugador #21', equipo: 'Manizales FC', minuto: 60 },
        { jugador: 'Pedro Gol', equipo: 'Once Caldas', minuto: 88 },
      ]);
    });

    it('no envía nada si nadie tiene boleta o apuesta del partido', async () => {
      jest.spyOn(service, 'findAficionadosDelPartido').mockResolvedValue([]);

      await expect(service.notificarResumen('partido-nuevo')).resolves.toBe(0);
      await expect(service.notificarGol('partido-nuevo', 'g1')).resolves.toBe(0);
      expect(notifications.enviarResumenPartido).not.toHaveBeenCalled();
      expect(notifications.enviarGol).not.toHaveBeenCalled();
    });

    it('no envía nada si el partido o el gol ya no existen', async () => {
      await expect(service.notificarGol('partido-nuevo', 'otro')).resolves.toBe(0);
      partidosRepository.findOne.mockResolvedValue(null);
      await expect(service.notificarResumen('partido-nuevo')).resolves.toBe(0);
      expect(notifications.enviarGol).not.toHaveBeenCalled();
      expect(notifications.enviarResumenPartido).not.toHaveBeenCalled();
    });
  });
});
