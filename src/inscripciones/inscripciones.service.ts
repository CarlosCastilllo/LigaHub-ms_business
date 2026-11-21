import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscripcionResponseDto } from './dto/inscripcion-response.dto';
import { TorneoInscripcionesReportDto } from './dto/torneo-inscripciones-report.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionMapper } from './mappers/inscripcion.mapper';
import { InscripcionesRepository } from './repositories/inscripciones.repository';
import { EstadoTorneo, Torneo } from '../torneos/entities/torneo.entity';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { FindInscripcionesQueryDto } from './dto/find-inscripciones-query.dto';

const DUPLICATE_INSCRIPTION_MESSAGE =
  'El equipo ya se encuentra inscrito en el torneo';

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly customInscripcionesRepository: InscripcionesRepository,
  ) {}

  async create(dto: CreateInscripcionDto): Promise<InscripcionResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const equipo = await this.findEquipo(dto.equipo_id);
    this.assertInscripcionesAbiertas(torneo);
    this.assertEquipoActivo(equipo);
    this.assertTorneoActivo(torneo);
    this.assertEquipoPerteneceAlDeporte(equipo, torneo);
    await this.assertCupoDisponible(torneo);
    await this.assertNoDuplicada(torneo.id, equipo.id);
    try {
      const entity = InscripcionMapper.toEntity(dto, torneo, equipo);
      const saved = await this.inscripcionesRepository.save(entity);
      return InscripcionMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(DUPLICATE_INSCRIPTION_MESSAGE);
      }
      throw error;
    }
  }

  async findAll(
    filtros: FindInscripcionesQueryDto = {},
  ): Promise<InscripcionResponseDto[]> {
    const { torneo_id, equipo_id } = filtros;
    if (torneo_id) await this.findTorneo(torneo_id);
    if (equipo_id) await this.findEquipo(equipo_id);
    const inscripciones = await this.inscripcionesRepository.find({
      where:
        torneo_id || equipo_id
          ? {
              ...(torneo_id && { torneo: { id: torneo_id } }),
              ...(equipo_id && { equipo: { id: equipo_id } }),
            }
          : undefined,
      relations: { torneo: true, equipo: true },
    });
    return InscripcionMapper.toResponseDtoList(inscripciones);
  }

  async findOne(id: string): Promise<InscripcionResponseDto> {
    return InscripcionMapper.toResponseDto(await this.findInscripcion(id));
  }

  async update(
    id: string,
    dto: UpdateInscripcionDto,
  ): Promise<InscripcionResponseDto> {
    const inscripcion = await this.findInscripcion(id);
    const torneoFinal = dto.torneo_id
      ? await this.findTorneo(dto.torneo_id)
      : await this.findTorneo(inscripcion.torneo_id);
    const equipoFinal = dto.equipo_id
      ? await this.findEquipo(dto.equipo_id)
      : await this.findEquipo(inscripcion.equipo_id);

    if (dto.torneo_id !== undefined || dto.equipo_id !== undefined) {
      this.assertInscripcionesAbiertas(torneoFinal);
      this.assertEquipoActivo(equipoFinal);
      this.assertTorneoActivo(torneoFinal);
      this.assertEquipoPerteneceAlDeporte(equipoFinal, torneoFinal);
      await this.assertNoDuplicada(
        torneoFinal.id,
        equipoFinal.id,
        inscripcion.id,
      );
    }
    if (dto.torneo_id !== undefined) {
      inscripcion.torneo = torneoFinal;
    }
    if (dto.equipo_id !== undefined) {
      inscripcion.equipo = equipoFinal;
    }
    try {
      const saved = await this.inscripcionesRepository.save(
        InscripcionMapper.mergeEntity(inscripcion, dto),
      );
      return InscripcionMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(DUPLICATE_INSCRIPTION_MESSAGE);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const inscripcion = await this.findInscripcion(id);
    const torneo = await this.findTorneo(inscripcion.torneo_id);
    this.assertInscripcionesAbiertas(torneo);
    await this.inscripcionesRepository.remove(inscripcion);
    return { message: 'Inscripción retirada correctamente' };
  }

  async getCountByTorneo(
    torneoId: string,
  ): Promise<TorneoInscripcionesReportDto> {
    await this.findTorneo(torneoId);
    return {
      torneo_id: torneoId,
      total_inscripciones:
        await this.customInscripcionesRepository.countByTorneo(torneoId),
    };
  }

  private async findInscripcion(id: string): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionesRepository.findOne({
      where: { id },
      relations: {
        torneo: { deporte: true },
        equipo: { equipos_deportes: { deporte: true } },
      },
    });
    if (!inscripcion) {
      throw new NotFoundException('La inscripción no fue encontrada');
    }
    return inscripcion;
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({
      where: { id },
      relations: { deporte: true },
    });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    return torneo;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({
      where: { id },
      relations: { equipos_deportes: { deporte: true } },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    return equipo;
  }

  private assertInscripcionesAbiertas(torneo: Torneo): void {
    if (
      (torneo.estado !== undefined &&
        torneo.estado !== EstadoTorneo.PENDIENTE) ||
      torneo.activo === false
    ) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" no acepta inscripciones ni retiros`,
      );
    }
  }

  private assertTorneoActivo(torneo: Torneo): void {
    if (torneo.activo === false) {
      throw new BadRequestException(
        `El torneo "${torneo.nombre}" no está activo`,
      );
    }
  }

  private assertEquipoActivo(equipo: Equipo): void {
    if (equipo.activo === false) {
      throw new BadRequestException(
        `El equipo "${equipo.nombre}" no está activo`,
      );
    }
  }

  private assertEquipoPerteneceAlDeporte(
    equipo: Equipo,
    torneo: Torneo,
  ): void {
    const asociado = equipo.equipos_deportes?.some(
      (relacion) =>
        relacion.deporte_id === torneo.deporte_id ||
        relacion.deporte?.id === torneo.deporte_id,
    );
    if (!asociado) {
      throw new BadRequestException(
        `El equipo "${equipo.nombre}" no está asociado al deporte del torneo "${torneo.nombre}"`,
      );
    }
  }

  private async assertCupoDisponible(torneo: Torneo): Promise<void> {
    const total = await this.inscripcionesRepository.count({
      where: { torneo: { id: torneo.id } },
    });
    if (total >= torneo.max_equipos) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" alcanzó la cantidad máxima de equipos`,
      );
    }
  }

  private async assertNoDuplicada(
    torneoId: string,
    equipoId: string,
    currentId?: string,
  ): Promise<void> {
    const existente = await this.inscripcionesRepository.findOne({
      where: {
        torneo: { id: torneoId },
        equipo: { id: equipoId },
      },
    });
    if (existente && existente.id !== currentId) {
      throw new ConflictException(DUPLICATE_INSCRIPTION_MESSAGE);
    }
  }
}
