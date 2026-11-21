import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { Habilidad } from '../habilidades/entities/habilidad.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { CreateHabilidadJugadorDto } from './dto/create-habilidad-jugador.dto';
import { FindHabilidadJugadorQueryDto } from './dto/find-habilidad-jugador-query.dto';
import { HabilidadJugadorResponseDto } from './dto/habilidad-jugador-response.dto';
import { UpdateHabilidadJugadorDto } from './dto/update-habilidad-jugador.dto';
import { HabilidadJugador } from './entities/habilidad-jugador.entity';
import { HabilidadJugadorMapper } from './mappers/habilidad-jugador.mapper';

const DUPLICATE_ASSOCIATION_MESSAGE =
  'Esta habilidad ya está asignada al jugador';

@Injectable()
export class HabilidadJugadorService {
  constructor(
    @InjectRepository(HabilidadJugador)
    private readonly relacionesRepository: Repository<HabilidadJugador>,
    @InjectRepository(Habilidad)
    private readonly habilidadesRepository: Repository<Habilidad>,
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
  ) {}

  async create(
    dto: CreateHabilidadJugadorDto,
  ): Promise<HabilidadJugadorResponseDto> {
    const habilidad = await this.findHabilidad(dto.habilidad_id);
    const jugador = await this.findJugador(dto.jugador_id);
    await this.assertAssociationDoesNotExist(dto.habilidad_id, dto.jugador_id);
    return this.guardar(HabilidadJugadorMapper.toEntity(habilidad, jugador));
  }

  async findAll(
    filtros: FindHabilidadJugadorQueryDto = {},
  ): Promise<HabilidadJugadorResponseDto[]> {
    const { habilidad_id, jugador_id } = filtros;
    if (habilidad_id) await this.findHabilidad(habilidad_id);
    if (jugador_id) await this.findJugador(jugador_id);
    const relaciones = await this.relacionesRepository.find({
      where:
        habilidad_id || jugador_id
          ? {
              ...(habilidad_id && { habilidad: { id: habilidad_id } }),
              ...(jugador_id && { jugador: { id: jugador_id } }),
            }
          : undefined,
      relations: { habilidad: true, jugador: true },
    });
    return HabilidadJugadorMapper.toResponseDtoList(relaciones);
  }

  async findOne(id: string): Promise<HabilidadJugadorResponseDto> {
    return HabilidadJugadorMapper.toResponseDto(await this.findRelacion(id));
  }

  async update(
    id: string,
    dto: UpdateHabilidadJugadorDto,
  ): Promise<HabilidadJugadorResponseDto> {
    const relacion = await this.findRelacion(id);
    const habilidadId = dto.habilidad_id ?? relacion.habilidad_id;
    const jugadorId = dto.jugador_id ?? relacion.jugador_id;
    if (dto.habilidad_id !== undefined || dto.jugador_id !== undefined) {
      await this.assertAssociationDoesNotExist(habilidadId, jugadorId, id);
    }
    if (dto.habilidad_id !== undefined) {
      relacion.habilidad = await this.findHabilidad(dto.habilidad_id);
    }
    if (dto.jugador_id !== undefined) {
      relacion.jugador = await this.findJugador(dto.jugador_id);
    }
    return this.guardar(relacion);
  }

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.relacionesRepository.remove(relacion);
    return { message: 'La habilidad se retiró correctamente del jugador' };
  }

  private async guardar(
    relacion: HabilidadJugador,
  ): Promise<HabilidadJugadorResponseDto> {
    try {
      const saved = await this.relacionesRepository.save(relacion);
      return HabilidadJugadorMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(DUPLICATE_ASSOCIATION_MESSAGE);
      }
      throw error;
    }
  }

  private async findRelacion(id: string): Promise<HabilidadJugador> {
    const relacion = await this.relacionesRepository.findOne({
      where: { id },
      relations: { habilidad: true, jugador: true },
    });
    if (!relacion) {
      throw new NotFoundException('La relación entre la habilidad y el jugador no fue encontrada');
    }
    return relacion;
  }

  private async findHabilidad(id: string): Promise<Habilidad> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
    });
    if (!habilidad) {
      throw new NotFoundException('La habilidad no fue encontrada');
    }
    return habilidad;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }
    return jugador;
  }

  private async assertAssociationDoesNotExist(
    habilidadId: string,
    jugadorId: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.relacionesRepository.findOne({
      where: {
        habilidad: { id: habilidadId },
        jugador: { id: jugadorId },
      },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException(DUPLICATE_ASSOCIATION_MESSAGE);
    }
  }
}
