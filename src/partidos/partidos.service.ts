import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import {
  EscenarioTorneo,
  EstadoAsignacionEscenario,
} from '../escenarios-torneo/entities/escenario-torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { EstadoFase, Fase } from '../fases/entities/fase.entity';
import {
  EstadoInscripcion,
  Inscripcion,
} from '../inscripciones/entities/inscripcion.entity';
import { EstadoTorneo } from '../torneos/entities/torneo.entity';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { PartidoResponseDto } from './dto/partido-response.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { FindPartidosQueryDto } from './dto/find-partidos-query.dto';
import { EstadoPartido, Partido } from './entities/partido.entity';
import { PartidoMapper } from './mappers/partido.mapper';
import { PartidoNotificacionesService } from './partido-notificaciones.service';

const FASE_RELATIONS = { grupos: true, final: true, torneo: true } as const;

const PARTIDO_RELATIONS = {
  escenario: true,
  boletas: true,
  apuestas: true,
  anotaciones: true,
  pelota: true,
  equipo_local: true,
  equipo_visitante: true,
  // El detalle 1:1 permite saber si el partido es de grupos o de la fase final.
  fase: FASE_RELATIONS,
} as const;

// Estados en los que el partido ya no admite cambios (HU-GC-06).
const ESTADOS_CERRADOS = [EstadoPartido.FINALIZADO, EstadoPartido.CANCELADO];

@Injectable()
export class PartidosService {
  private readonly logger = new Logger(PartidosService.name);

  constructor(
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
    @InjectRepository(EscenarioTorneo)
    private readonly escenariosTorneoRepository: Repository<EscenarioTorneo>,
    private readonly notificaciones: PartidoNotificacionesService,
  ) {}

  async create(
    dto: CreatePartidoDto,
    authorization?: string,
  ): Promise<PartidoResponseDto> {
    this.assertEquiposDistintos(dto.equipo_local_id, dto.equipo_visitante_id);
    const fase = await this.findFase(dto.fase_id);
    this.assertFaseAdmitePartidos(fase);
    const equipoLocal = await this.findEquipo(dto.equipo_local_id);
    const equipoVisitante = await this.findEquipo(dto.equipo_visitante_id);
    await this.assertEquipoHabilitado(equipoLocal, fase);
    await this.assertEquipoHabilitado(equipoVisitante, fase);
    const escenario = dto.escenario_id
      ? await this.findEscenarioDelTorneo(dto.escenario_id, fase)
      : null;
    await this.assertFaseFinalConCupo(fase);

    const saved = await this.partidosRepository.save(
      PartidoMapper.toEntity(
        dto,
        escenario,
        equipoLocal,
        equipoVisitante,
        fase,
      ),
    );

    // El correo no bloquea ni hace fallar el registro del partido.
    this.notificaciones
      .notificarNuevoPartido(saved, fase, authorization)
      .catch((error: unknown) =>
        this.logger.error(
          `No fue posible notificar el partido ${saved.id}: ${String(error)}`,
        ),
      );

    return PartidoMapper.toResponseDto(saved);
  }

  async findAll(
    filtros: FindPartidosQueryDto = {},
  ): Promise<PartidoResponseDto[]> {
    if (filtros.fase_id) {
      await this.findFase(filtros.fase_id);
      const partidos = await this.partidosRepository.find({
        where: { fase: { id: filtros.fase_id } },
        relations: PARTIDO_RELATIONS,
        order: { fecha_hora: 'ASC' },
      });
      return PartidoMapper.toResponseDtoList(partidos);
    }
    if (filtros.torneo_id) {
      const partidos = await this.partidosRepository.find({
        where: { fase: { torneo: { id: filtros.torneo_id } } },
        relations: PARTIDO_RELATIONS,
        order: { fecha_hora: 'ASC' },
      });
      return PartidoMapper.toResponseDtoList(partidos);
    }
    const partidos = await this.partidosRepository.find({
      relations: PARTIDO_RELATIONS,
      order: { fecha_hora: 'ASC' },
    });
    return PartidoMapper.toResponseDtoList(partidos);
  }

  async findOne(id: string): Promise<PartidoResponseDto> {
    return PartidoMapper.toResponseDto(await this.findPartido(id));
  }

  async update(
    id: string,
    dto: UpdatePartidoDto,
    authorization?: string,
  ): Promise<PartidoResponseDto> {
    const partido = await this.findPartido(id);
    this.assertPartidoEditable(partido, dto);
    // HU-GC-07: el resumen se envía solo en la transición EN_JUEGO -> FINALIZADO.
    const finaliza =
      partido.estado === EstadoPartido.EN_JUEGO &&
      dto.estado === EstadoPartido.FINALIZADO;

    const localId = dto.equipo_local_id ?? partido.equipo_local_id;
    const visitanteId = dto.equipo_visitante_id ?? partido.equipo_visitante_id;
    // Se valida con los valores que quedarian despues de aplicar el PATCH.
    this.assertEquiposDistintos(localId, visitanteId);

    const cambiaFase =
      dto.fase_id !== undefined && dto.fase_id !== partido.fase?.id;
    if (cambiaFase) {
      const fase = await this.findFase(dto.fase_id!);
      this.assertFaseAdmitePartidos(fase);
      await this.assertFaseFinalConCupo(fase);
      partido.fase = fase;
    }

    const cambiaLocal = localId !== partido.equipo_local_id;
    const cambiaVisitante = visitanteId !== partido.equipo_visitante_id;
    if (cambiaLocal) partido.equipo_local = await this.findEquipo(localId);
    if (cambiaVisitante) {
      partido.equipo_visitante = await this.findEquipo(visitanteId);
    }
    // Si cambian los equipos o la fase, ambos equipos deben seguir habilitados.
    if ((cambiaFase || cambiaLocal || cambiaVisitante) && partido.fase) {
      await this.assertEquipoHabilitado(partido.equipo_local, partido.fase);
      await this.assertEquipoHabilitado(partido.equipo_visitante, partido.fase);
    }

    await this.aplicarEscenario(partido, dto, cambiaFase);

    const saved = await this.partidosRepository.save(
      PartidoMapper.mergeEntity(partido, dto),
    );

    // El correo no bloquea ni hace fallar la actualización del partido.
    if (finaliza) {
      this.notificaciones
        .notificarResumen(saved.id, authorization)
        .catch((error: unknown) =>
          this.logger.error(
            `No fue posible enviar el resumen del partido ${saved.id}: ${String(error)}`,
          ),
        );
    }

    return PartidoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const partido = await this.findPartido(id);
    // Las FKs de boletas y apuestas usan ON DELETE NO ACTION.
    // Las anotaciones no bloquean: su FK es ON DELETE CASCADE.
    // La FK de la pelota (1:1) tambien es NO ACTION.
    if (partido.pelota) {
      throw new ConflictException(
        'El partido tiene una pelota asignada. Desasigne la pelota primero',
      );
    }
    if (partido.boletas?.length) {
      throw new ConflictException(
        'El partido tiene boletas asociadas. Elimine las boletas primero',
      );
    }
    if (partido.apuestas?.length) {
      throw new ConflictException(
        'El partido tiene apuestas asociadas. Elimine las apuestas primero',
      );
    }
    await this.partidosRepository.remove(partido);
    return { message: 'El partido se eliminó correctamente' };
  }

  private assertEquiposDistintos(localId: string, visitanteId: string): void {
    if (localId === visitanteId) {
      throw new BadRequestException(
        'Un equipo no puede jugar contra sí mismo: elija equipos distintos',
      );
    }
  }

  // FINALIZADO y CANCELADO no se editan; EN_JUEGO solo admite cambiar el
  // estado. Solo un partido en juego puede pasar a FINALIZADO (HU-GC-07).
  private assertPartidoEditable(partido: Partido, dto: UpdatePartidoDto): void {
    if (ESTADOS_CERRADOS.includes(partido.estado)) {
      throw new ConflictException(
        `El partido está ${partido.estado.toLowerCase()} y ya no puede modificarse`,
      );
    }
    if (
      dto.estado === EstadoPartido.FINALIZADO &&
      partido.estado !== EstadoPartido.EN_JUEGO
    ) {
      throw new ConflictException(
        'Solo un partido en juego puede marcarse como finalizado',
      );
    }
    if (partido.estado !== EstadoPartido.EN_JUEGO) return;

    const cambiaFecha =
      dto.fecha_hora !== undefined &&
      new Date(dto.fecha_hora).getTime() !==
        new Date(partido.fecha_hora).getTime();
    const cambiaProgramacion =
      cambiaFecha ||
      (dto.equipo_local_id !== undefined &&
        dto.equipo_local_id !== partido.equipo_local_id) ||
      (dto.equipo_visitante_id !== undefined &&
        dto.equipo_visitante_id !== partido.equipo_visitante_id) ||
      (dto.fase_id !== undefined && dto.fase_id !== partido.fase_id) ||
      (dto.escenario_id !== undefined &&
        (dto.escenario_id ?? null) !== (partido.escenario_id ?? null));
    if (cambiaProgramacion) {
      throw new ConflictException(
        'Un partido en juego solo permite actualizar su estado',
      );
    }
    if (dto.estado === EstadoPartido.PROGRAMADO) {
      throw new ConflictException(
        'Un partido en juego no puede volver al estado programado',
      );
    }
  }

  // Asigna, cambia o quita el escenario; si cambia la fase se revalida contra
  // el torneo nuevo. Con boletas vendidas el escenario ya no se puede cambiar.
  private async aplicarEscenario(
    partido: Partido,
    dto: UpdatePartidoDto,
    cambiaFase: boolean,
  ): Promise<void> {
    const actualId = partido.escenario?.id ?? partido.escenario_id ?? null;
    const nuevoId =
      dto.escenario_id === undefined ? actualId : (dto.escenario_id ?? null);

    if (nuevoId !== actualId && partido.boletas?.length) {
      throw new ConflictException(
        'El partido tiene boletas vendidas; no se puede cambiar su escenario',
      );
    }
    if (nuevoId === null) {
      partido.escenario = null;
      return;
    }
    if (nuevoId !== actualId || cambiaFase) {
      partido.escenario = partido.fase
        ? await this.findEscenarioDelTorneo(nuevoId, partido.fase)
        : await this.findEscenario(nuevoId);
    }
  }

  private async findPartido(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id },
      relations: PARTIDO_RELATIONS,
    });
    if (!partido) {
      throw new NotFoundException('El partido no fue encontrado');
    }
    return partido;
  }

  private async findEscenario(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
    });
    if (!escenario) {
      throw new NotFoundException('El escenario no fue encontrado');
    }
    return escenario;
  }

  // El escenario debe estar asignado (ACTIVO) al torneo de la fase.
  private async findEscenarioDelTorneo(
    id: string,
    fase: Fase,
  ): Promise<Escenario> {
    const escenario = await this.findEscenario(id);
    const asignacion = await this.escenariosTorneoRepository.findOne({
      where: {
        escenario: { id },
        torneo: { id: fase.torneo?.id ?? fase.torneo_id },
        estado: EstadoAsignacionEscenario.ACTIVO,
      },
    });
    if (!asignacion) {
      throw new ConflictException(
        `El escenario "${escenario.nombre}" no está asignado al torneo de la fase`,
      );
    }
    return escenario;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    return equipo;
  }

  private async findFase(id: string): Promise<Fase> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    return fase;
  }

  // El torneo debe seguir activo y sin finalizar, y la fase sin finalizar.
  private assertFaseAdmitePartidos(fase: Fase): void {
    const torneo = fase.torneo;
    if (torneo && !torneo.activo) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" está inactivo y no admite partidos`,
      );
    }
    if (torneo?.estado === EstadoTorneo.FINALIZADO) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" ya finalizó y no admite partidos`,
      );
    }
    if (fase.estado === EstadoFase.FINALIZADA) {
      throw new ConflictException(
        'La fase ya finalizó y no admite nuevos partidos',
      );
    }
  }

  // Habilitado = equipo activo, inscripción ACEPTADA en el torneo de la fase
  // y, si la fase es de grupos, pertenecer a ese grupo.
  private async assertEquipoHabilitado(equipo: Equipo, fase: Fase): Promise<void> {
    if (!equipo.activo) {
      throw new ConflictException(
        `El equipo "${equipo.nombre}" está inactivo y no puede participar`,
      );
    }
    const torneoId = fase.torneo?.id ?? fase.torneo_id;
    const inscripcion = await this.inscripcionesRepository.findOne({
      where: {
        equipo: { id: equipo.id },
        torneo: { id: torneoId },
        estado: EstadoInscripcion.ACEPTADA,
      },
    });
    if (!inscripcion) {
      throw new ConflictException(
        `El equipo "${equipo.nombre}" no tiene una inscripción aceptada en el torneo`,
      );
    }
    if (fase.grupos && equipo.fase_grupos_id !== fase.grupos.id) {
      throw new ConflictException(
        `El equipo "${equipo.nombre}" no pertenece al grupo "${fase.grupos.nombre}"`,
      );
    }
  }

  // Reglas de la fase final: no recibe más partidos de los que su
  // configuración admite.
  private async assertFaseFinalConCupo(fase: Fase): Promise<void> {
    if (!fase.final) return;
    const limite = fase.final.numero_partidos;
    if (limite == null) return;
    const actuales = await this.partidosRepository.count({
      where: { fase: { id: fase.id } },
    });
    if (actuales >= limite) {
      throw new ConflictException(
        `La fase final admite ${limite} ${limite === 1 ? 'partido' : 'partidos'} y ya los tiene todos registrados`,
      );
    }
  }
}
