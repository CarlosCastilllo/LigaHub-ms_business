import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
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
  let notifications: { enviarNuevoPartido: jest.Mock<any> };

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
    notifications = { enviarNuevoPartido: jest.fn<any>().mockResolvedValue(2) };
    service = new PartidoNotificacionesService(
      {} as Repository<Aficionado>,
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
});
