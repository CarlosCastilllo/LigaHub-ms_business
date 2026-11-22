import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EquipoJugador } from '../equipo-jugador/entities/equipo-jugador.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { PartidoNotificacionesService } from '../partidos/partido-notificaciones.service';
import { AnotacionResponseDto } from './dto/anotacion-response.dto';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { FindAnotacionesQueryDto } from './dto/find-anotaciones-query.dto';
import { UpdateAnotacionDto } from './dto/update-anotacion.dto';
import { Anotacion } from './entities/anotacion.entity';
import { AnotacionMapper } from './mappers/anotacion.mapper';

// HU-GC-07: los goles se gestionan con el partido en juego; en un partido
// finalizado solo se admiten correcciones (sin aviso por correo).
const ESTADOS_CON_ANOTACIONES: EstadoPartido[] = [
  EstadoPartido.EN_JUEGO,
  EstadoPartido.FINALIZADO,
];

// Colombia no usa horario de verano: UTC-5 fijo.
const OFFSET_COLOMBIA_MS = 5 * 60 * 60 * 1000;

@Injectable()
export class AnotacionesService {
  private readonly logger = new Logger(AnotacionesService.name);

  constructor(
    @InjectRepository(Anotacion)
    private readonly anotacionesRepository: Repository<Anotacion>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
    @InjectRepository(EquipoJugador)
    private readonly equipoJugadorRepository: Repository<EquipoJugador>,
    private readonly notificaciones: PartidoNotificacionesService,
  ) {}

  async create(
    dto: CreateAnotacionDto,
    authorization?: string,
  ): Promise<AnotacionResponseDto> {
    const partido = await this.findPartido(dto.partido_id);
    this.assertPartidoAdmiteAnotaciones(partido);
    const jugador = await this.findJugador(dto.jugador_id);
    const equipo = await this.findEquipoDelJugador(partido, jugador);

    const saved = await this.anotacionesRepository.save(
      AnotacionMapper.toEntity(dto, partido, jugador, equipo),
    );

    // Solo los goles registrados con el partido en juego se avisan por
    // correo; las correcciones de un partido finalizado no.
    if (partido.estado === EstadoPartido.EN_JUEGO) {
      this.notificaciones
        .notificarGol(partido.id, saved.id, authorization)
        .catch((error: unknown) =>
          this.logger.error(
            `No fue posible notificar el gol ${saved.id}: ${String(error)}`,
          ),
        );
    }

    return AnotacionMapper.toResponseDto(saved);
  }

  async findAll(
    filtros: FindAnotacionesQueryDto = {},
  ): Promise<AnotacionResponseDto[]> {
    if (filtros.partido_id) await this.findPartido(filtros.partido_id);
    const anotaciones = await this.anotacionesRepository.find({
      where: filtros.partido_id ? { partido: { id: filtros.partido_id } } : {},
      relations: { partido: true, jugador: true, equipo: true },
      order: { minuto: 'ASC' },
    });
    return AnotacionMapper.toResponseDtoList(anotaciones);
  }

  async findOne(id: string): Promise<AnotacionResponseDto> {
    return AnotacionMapper.toResponseDto(await this.findAnotacion(id));
  }

  async update(
    id: string,
    dto: UpdateAnotacionDto,
  ): Promise<AnotacionResponseDto> {
    const anotacion = await this.findAnotacion(id);
    this.assertPartidoAdmiteAnotaciones(anotacion.partido);
    if (
      dto.jugador_id !== undefined &&
      dto.jugador_id !== anotacion.jugador.id
    ) {
      anotacion.jugador = await this.findJugador(dto.jugador_id);
      anotacion.equipo = await this.findEquipoDelJugador(
        anotacion.partido,
        anotacion.jugador,
      );
    }
    const saved = await this.anotacionesRepository.save(
      AnotacionMapper.mergeEntity(anotacion, dto),
    );
    return AnotacionMapper.toResponseDto(saved);
  }

  // Solo se elimina la anotación: el jugador y el partido se conservan.
  async remove(id: string): Promise<{ message: string }> {
    const anotacion = await this.findAnotacion(id);
    this.assertPartidoAdmiteAnotaciones(anotacion.partido);
    await this.anotacionesRepository.remove(anotacion);
    return { message: 'La anotación se eliminó correctamente' };
  }

  private async findAnotacion(id: string): Promise<Anotacion> {
    const anotacion = await this.anotacionesRepository.findOne({
      where: { id },
      relations: {
        partido: { equipo_local: true, equipo_visitante: true },
        jugador: true,
        equipo: true,
      },
    });
    if (!anotacion) {
      throw new NotFoundException('La anotación no fue encontrada');
    }
    return anotacion;
  }

  private async findPartido(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id },
      relations: { equipo_local: true, equipo_visitante: true },
    });
    if (!partido) {
      throw new NotFoundException('El partido no fue encontrado');
    }
    return partido;
  }

  private assertPartidoAdmiteAnotaciones(partido: Partido): void {
    if (!ESTADOS_CON_ANOTACIONES.includes(partido.estado)) {
      throw new BadRequestException(
        'Las anotaciones solo se pueden gestionar en partidos en juego o finalizados',
      );
    }
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }
    return jugador;
  }

  // El jugador debe pertenecer a uno (y solo uno) de los equipos del partido:
  // vinculación activa, o vigente en la fecha del partido (para correcciones
  // de partidos ya jugados).
  private async findEquipoDelJugador(
    partido: Partido,
    jugador: Jugador,
  ): Promise<Equipo> {
    const equipos = [partido.equipo_local, partido.equipo_visitante];
    const vinculos = await this.equipoJugadorRepository.find({
      where: {
        jugador: { id: jugador.id },
        equipo: { id: In(equipos.map(({ id }) => id)) },
      },
      relations: { equipo: true },
    });
    const fechaPartido = AnotacionesService.fechaColombia(partido.fecha_hora);
    const equipoIds = new Set(
      vinculos
        .filter(
          (vinculo) =>
            vinculo.activo ||
            (vinculo.fecha_inicio <= fechaPartido &&
              (!vinculo.fecha_fin || vinculo.fecha_fin >= fechaPartido)),
        )
        .map((vinculo) => vinculo.equipo?.id ?? vinculo.equipo_id),
    );

    if (equipoIds.size === 0) {
      throw new BadRequestException(
        'El jugador no pertenece a ninguno de los equipos del partido',
      );
    }
    if (equipoIds.size > 1) {
      throw new ConflictException(
        'El jugador figura en ambos equipos del partido; corrija su vinculación antes de registrar el gol',
      );
    }
    const [equipoId] = [...equipoIds];
    return equipos.find(({ id }) => id === equipoId)!;
  }

  // Fecha (YYYY-MM-DD) del partido en hora de Colombia.
  private static fechaColombia(fecha: Date | string): string {
    const momento = new Date(new Date(fecha).getTime() - OFFSET_COLOMBIA_MS);
    return momento.toISOString().slice(0, 10);
  }
}
