import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Apuesta } from '../apuestas/entities/apuesta.entity';
import { Boleta } from '../boletas/entities/boleta.entity';
import {
  DestinatarioCorreo,
  NotificationsClient,
} from '../common/notifications/notifications.client';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Fase } from '../fases/entities/fase.entity';
import { EstadoPartido, Partido } from './entities/partido.entity';

// Máximo de destinatarios por envío, para no saturar la cuota de Gmail.
const MAX_DESTINATARIOS = 200;

// HU-GC-06: al crear un partido se avisa por correo a los aficionados que
// participaron (boleta o apuesta) en partidos anteriores de cualquiera de los
// dos equipos. El correo se toma de ms-security (user_id) y, si no se puede,
// del registro del aficionado.
@Injectable()
export class PartidoNotificacionesService {
  private readonly logger = new Logger(PartidoNotificacionesService.name);

  constructor(
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
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
