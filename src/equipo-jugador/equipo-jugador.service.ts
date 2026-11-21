import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { CreateEquipoJugadorDto } from './dto/create-equipo-jugador.dto';
import { EquipoJugadorResponseDto } from './dto/equipo-jugador-response.dto';
import { FindEquipoJugadorQueryDto } from './dto/find-equipo-jugador-query.dto';
import { RetirarEquipoJugadorDto } from './dto/retirar-equipo-jugador.dto';
import { UpdateEquipoJugadorDto } from './dto/update-equipo-jugador.dto';
import { EquipoJugador } from './entities/equipo-jugador.entity';
import { EquipoJugadorMapper } from './mappers/equipo-jugador.mapper';

const CONTRATO_VIGENTE_MESSAGE =
  'El jugador ya tiene un contrato activo con un equipo. Retírelo antes de asignarlo a otro';

@Injectable()
export class EquipoJugadorService {
  constructor(
    @InjectRepository(EquipoJugador)
    private readonly equipoJugadorRepository: Repository<EquipoJugador>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
  ) {}

  async create(
    dto: CreateEquipoJugadorDto,
  ): Promise<EquipoJugadorResponseDto> {
    this.validateDates(dto.fecha_inicio, dto.fecha_fin);
    const equipo = await this.findEquipo(dto.equipo_id);
    const jugador = await this.findJugador(dto.jugador_id);
    if (!equipo.activo) {
      throw new BadRequestException(`El equipo "${equipo.nombre}" no está activo`);
    }
    if (!jugador.activo) {
      throw new BadRequestException(
        jugador.user_id
          ? `El jugador asociado al usuario ${jugador.user_id} no está activo`
          : 'El jugador seleccionado no está activo',
      );
    }
    await this.assertSinContratoVigente(jugador.id);
    try {
      const saved = await this.equipoJugadorRepository.save(
        EquipoJugadorMapper.toEntity(dto, equipo, jugador),
      );
      return EquipoJugadorMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(CONTRATO_VIGENTE_MESSAGE);
      }
      throw error;
    }
  }

  async findAll(
    filtros: FindEquipoJugadorQueryDto = {},
  ): Promise<EquipoJugadorResponseDto[]> {
    const { equipo_id, jugador_id } = filtros;
    if (equipo_id) await this.findEquipo(equipo_id);
    if (jugador_id) await this.findJugador(jugador_id);
    const relaciones = await this.equipoJugadorRepository.find({
      where:
        equipo_id || jugador_id
          ? {
              ...(equipo_id && { equipo: { id: equipo_id } }),
              ...(jugador_id && { jugador: { id: jugador_id } }),
            }
          : undefined,
      relations: { equipo: true, jugador: true },
      order: { activo: 'DESC', fecha_inicio: 'DESC' },
    });
    return EquipoJugadorMapper.toResponseDtoList(relaciones);
  }

  async findOne(id: string): Promise<EquipoJugadorResponseDto> {
    return EquipoJugadorMapper.toResponseDto(await this.findRelacion(id));
  }

  async update(
    id: string,
    dto: UpdateEquipoJugadorDto,
  ): Promise<EquipoJugadorResponseDto> {
    const relacion = await this.findRelacion(id);
    const fechaInicio = dto.fecha_inicio ?? relacion.fecha_inicio;
    const fechaFin =
      dto.fecha_fin !== undefined
        ? dto.fecha_fin
        : (relacion.fecha_fin ?? null);
    this.validateDates(fechaInicio, fechaFin);
    const saved = await this.equipoJugadorRepository.save(
      EquipoJugadorMapper.mergeEntity(relacion, dto),
    );
    return EquipoJugadorMapper.toResponseDto(saved);
  }

  async retirar(
    id: string,
    dto: RetirarEquipoJugadorDto,
  ): Promise<EquipoJugadorResponseDto> {
    const relacion = await this.findRelacion(id);
    if (!relacion.activo) {
      throw new ConflictException('El jugador ya fue retirado de este equipo');
    }
    this.validateDates(relacion.fecha_inicio, dto.fecha_fin);
    const saved = await this.equipoJugadorRepository.save(
      EquipoJugadorMapper.retirar(relacion, dto.fecha_fin),
    );
    return EquipoJugadorMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.equipoJugadorRepository.remove(relacion);
    return { message: 'La relación entre el jugador y el equipo se eliminó correctamente' };
  }

  private validateDates(fechaInicio: string, fechaFin?: string | null): void {
    if (fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'fecha_fin must be equal to or later than fecha_inicio',
      );
    }
  }

  private async assertSinContratoVigente(jugadorId: string): Promise<void> {
    const vigente = await this.equipoJugadorRepository.findOne({
      where: { jugador: { id: jugadorId }, activo: true },
    });
    if (vigente) {
      throw new ConflictException(CONTRATO_VIGENTE_MESSAGE);
    }
  }

  private async findRelacion(id: string): Promise<EquipoJugador> {
    const relacion = await this.equipoJugadorRepository.findOne({
      where: { id },
      relations: { equipo: true, jugador: true },
    });
    if (!relacion) {
      throw new NotFoundException('La relación entre el jugador y el equipo no fue encontrada');
    }
    return relacion;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    return equipo;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }
    return jugador;
  }
}
