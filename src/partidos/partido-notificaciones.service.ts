import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Anotacion } from '../anotaciones/entities/anotacion.entity';
import { Apuesta, EstadoApuesta } from '../apuestas/entities/apuesta.entity';
import { Boleta, EstadoBoleta } from '../boletas/entities/boleta.entity';
import {
  DestinatarioCorreo,
  GolCorreo,
  MarcadorCorreo,
  NotificationsClient,
} from '../common/notifications/notifications.client';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Fase } from '../fases/entities/fase.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EstadoPartido, Partido } from './entities/partido.entity';
import { calcularMarcador } from './marcador';

// Máximo de destinatarios por envío, para no saturar la cuota de Gmail.
const MAX_DESTINATARIOS = 200;

const PARTIDO_CORREO_RELATIONS = {
  equipo_local: true,
  equipo_visitante: true,
  escenario: true,
  fase: { torneo: true, grupos: true, final: true },
  anotaciones: { jugador: true },
} as const;

// Correos a los aficionados (Flask + Gmail). El correo se toma de ms-security
// (user_id) y, si no se puede, del registro del aficionado.
// - HU-GC-06: nuevo partido, a quienes participaron en partidos anteriores de
//   alguno de los dos equipos.
// - HU-GC-07: gol y resumen final, a quienes tienen una boleta o una apuesta
//   (no anuladas) del partido.
@Injectable()
export class PartidoNotificacionesService {
  private readonly logger = new Logger(PartidoNotificacionesService.name);

  constructor(
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    private readonly securityUsers: SecurityUsersClient,
    private readonly notifications: NotificationsClient,
  ) {}

  async notificarNuevoPartido(
    partido: Partido,
    fase: Fase,
    authorization?: string,
  ): Promise<number> {
    const aficionados = await this.findAficionadosDeEquipos(partido);
    if (aficionados.length === 0) {
      this.logger.log(`Partido ${partido.id}: no hay aficionados a quienes avisar`);
      return 0;
    }
    const destinatarios = await this.resolverDestinatarios(
      aficionados,
      authorization,
    );
    if (destinatarios.length === 0) return 0;

    const enviados = await this.notifications.enviarNuevoPartido(
      destinatarios.slice(0, MAX_DESTINATARIOS),
      {
        equipo_local: partido.equipo_local.nombre,
        equipo_visitante: partido.equipo_visitante.nombre,
        fecha_hora: new Date(partido.fecha_hora).toISOString(),
        torneo: fase.torneo?.nombre ?? '',
        fase: PartidoNotificacionesService.nombreFase(fase),
        escenario: partido.escenario?.nombre ?? null,
        direccion: partido.escenario?.direccion ?? null,
      },
    );
    this.logger.log(
      `Partido ${partido.id}: ${enviados} de ${destinatarios.length} correos enviados`,
    );
    return enviados;
  }

  // HU-GC-07: aviso de un gol con el marcador actualizado.
  async notificarGol(
    partidoId: string,
    anotacionId: string,
    authorization?: string,
  ): Promise<number> {
    const partido = await this.findPartidoCorreo(partidoId);
    const anotacion = partido?.anotaciones?.find(({ id }) => id === anotacionId);
    if (!partido || !anotacion) return 0;

    const destinatarios = await this.destinatariosDelPartido(
      partido.id,
      authorization,
    );
    if (destinatarios.length === 0) return 0;

    const [gol] = await this.describirGoles(partido, [anotacion], authorization);
    const enviados = await this.notifications.enviarGol(
      destinatarios,
      this.marcadorCorreo(partido),
      gol,
    );
    this.logger.log(
      `Gol en el partido ${partido.id}: ${enviados} de ${destinatarios.length} correos enviados`,
    );
    return enviados;
  }

  // HU-GC-07: resumen con el marcador final y los goles del partido.
  async notificarResumen(
    partidoId: string,
    authorization?: string,
  ): Promise<number> {
    const partido = await this.findPartidoCorreo(partidoId);
    if (!partido) return 0;

    const destinatarios = await this.destinatariosDelPartido(
      partido.id,
      authorization,
    );
    if (destinatarios.length === 0) return 0;

    const anotaciones = [...(partido.anotaciones ?? [])].sort(
      (a, b) => a.minuto - b.minuto,
    );
    const goles = await this.describirGoles(partido, anotaciones, authorization);
    const enviados = await this.notifications.enviarResumenPartido(
      destinatarios,
      {
        ...this.marcadorCorreo(partido),
        fecha_hora: new Date(partido.fecha_hora).toISOString(),
        escenario: partido.escenario?.nombre ?? null,
      },
      goles,
    );
    this.logger.log(
      `Resumen del partido ${partido.id}: ${enviados} de ${destinatarios.length} correos enviados`,
    );
    return enviados;
  }

  // Aficionados con boleta o apuesta no anulada en este partido.
  async findAficionadosDelPartido(partidoId: string): Promise<Aficionado[]> {
    const conRegistro = (
      entidad: typeof Boleta | typeof Apuesta,
      alias: string,
      anulada: string,
    ) =>
      this.aficionadosRepository.manager
        .createQueryBuilder(entidad, alias)
        .select(`${alias}.aficionado_id`)
        .where(`${alias}.partido_id = :partidoId`)
        .andWhere(`${alias}.estado <> :${anulada}`)
        .getQuery();

    return this.aficionadosRepository
      .createQueryBuilder('a')
      .where(`a.id IN (${conRegistro(Boleta, 'b', 'boletaAnulada')})`)
      .orWhere(`a.id IN (${conRegistro(Apuesta, 'ap', 'apuestaAnulada')})`)
      .setParameters({
        partidoId,
        boletaAnulada: EstadoBoleta.ANULADA,
        apuestaAnulada: EstadoApuesta.ANULADA,
      })
      .getMany();
  }

  // Aficionados con boleta o apuesta en partidos ya jugados (no cancelados)
  // donde participó el equipo local o el visitante del nuevo partido.
  async findAficionadosDeEquipos(partido: Partido): Promise<Aficionado[]> {
    const equipos = [partido.equipo_local.id, partido.equipo_visitante.id];
    const ahora = new Date();
    const participaron = (
      entidad: typeof Boleta | typeof Apuesta,
      alias: string,
    ) =>
      this.aficionadosRepository.manager
        .createQueryBuilder(entidad, alias)
        .select(`${alias}.aficionado_id`)
        .innerJoin(`${alias}.partido`, `${alias}_p`)
        .where(`${alias}_p.id <> :nuevoId`)
        .andWhere(`${alias}_p.fecha_hora < :ahora`)
        .andWhere(`${alias}_p.estado <> :cancelado`)
        .andWhere(
          new Brackets((qb) =>
            qb
              .where(`${alias}_p.equipo_local_id IN (:...equipos)`)
              .orWhere(`${alias}_p.equipo_visitante_id IN (:...equipos)`),
          ),
        )
        .getQuery();

    return this.aficionadosRepository
      .createQueryBuilder('a')
      .where(`a.id IN (${participaron(Boleta, 'b')})`)
      .orWhere(`a.id IN (${participaron(Apuesta, 'ap')})`)
      .setParameters({
        nuevoId: partido.id,
        ahora,
        cancelado: EstadoPartido.CANCELADO,
        equipos,
      })
      .getMany();
  }

  private findPartidoCorreo(id: string): Promise<Partido | null> {
    return this.partidosRepository.findOne({
      where: { id },
      relations: PARTIDO_CORREO_RELATIONS,
    });
  }

  private async destinatariosDelPartido(
    partidoId: string,
    authorization?: string,
  ): Promise<DestinatarioCorreo[]> {
    const aficionados = await this.findAficionadosDelPartido(partidoId);
    if (aficionados.length === 0) {
      this.logger.log(
        `Partido ${partidoId}: no hay aficionados con boleta o apuesta a quienes avisar`,
      );
      return [];
    }
    const destinatarios = await this.resolverDestinatarios(
      aficionados,
      authorization,
    );
    return destinatarios.slice(0, MAX_DESTINATARIOS);
  }

  private marcadorCorreo(partido: Partido): MarcadorCorreo {
    return {
      equipo_local: partido.equipo_local.nombre,
      equipo_visitante: partido.equipo_visitante.nombre,
      ...calcularMarcador(partido),
      torneo: partido.fase?.torneo?.nombre ?? '',
      fase: partido.fase ? PartidoNotificacionesService.nombreFase(partido.fase) : '',
    };
  }

  // Nombre del goleador (ms-security) y equipo al que se sumó cada gol.
  private async describirGoles(
    partido: Partido,
    anotaciones: Anotacion[],
    authorization?: string,
  ): Promise<GolCorreo[]> {
    const nombres = new Map<string, Promise<string>>();
    const nombreDe = (jugador: Jugador) => {
      if (!nombres.has(jugador.id)) {
        nombres.set(jugador.id, this.nombreJugador(jugador, authorization));
      }
      return nombres.get(jugador.id)!;
    };
    return Promise.all(
      anotaciones.map(async (anotacion) => ({
        jugador: await nombreDe(anotacion.jugador),
        equipo:
          (anotacion.equipo?.id ?? anotacion.equipo_id) === partido.equipo_local.id
            ? partido.equipo_local.nombre
            : partido.equipo_visitante.nombre,
        minuto: anotacion.minuto,
      })),
    );
  }

  private async nombreJugador(
    jugador: Jugador,
    authorization?: string,
  ): Promise<string> {
    const contacto = await this.securityUsers.findUserContact(
      jugador.user_id,
      authorization,
    );
    return contacto?.name?.trim() || `Jugador #${jugador.user_id}`;
  }

  private async resolverDestinatarios(
    aficionados: Aficionado[],
    authorization?: string,
  ): Promise<DestinatarioCorreo[]> {
    const resueltos = await Promise.all(
      aficionados.map(async (aficionado) => {
        const contacto =
          aficionado.user_id != null
            ? await this.securityUsers.findUserContact(
                aficionado.user_id,
                authorization,
              )
            : null;
        return {
          email: contacto?.email || aficionado.email,
          nombre: aficionado.nombre || contacto?.name || '',
        };
      }),
    );
    // Un correo por dirección, aunque dos aficionados la compartan.
    const unicos = new Map<string, DestinatarioCorreo>();
    for (const destinatario of resueltos) {
      if (!destinatario.email) continue;
      const clave = destinatario.email.trim().toLowerCase();
      if (!unicos.has(clave)) unicos.set(clave, destinatario);
    }
    return [...unicos.values()];
  }

  private static nombreFase(fase: Fase): string {
    if (fase.grupos?.nombre) return fase.grupos.nombre;
    if (fase.final) return 'Fase final';
    return `Fase ${fase.numero_orden}`;
  }
}
