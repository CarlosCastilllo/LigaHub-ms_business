import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Habilidad } from '../habilidades/entities/habilidad.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { CreateHabilidadJugadorDto } from './dto/create-habilidad-jugador.dto';
import { HabilidadJugadorResponseDto } from './dto/habilidad-jugador-response.dto';
import { UpdateHabilidadJugadorDto } from './dto/update-habilidad-jugador.dto';
import { HabilidadJugador } from './entities/habilidad-jugador.entity';
import { HabilidadJugadorMapper } from './mappers/habilidad-jugador.mapper';

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
    const saved = await this.relacionesRepository.save(
      HabilidadJugadorMapper.toEntity(habilidad, jugador),
    );
    return HabilidadJugadorMapper.toResponseDto(saved);
  }

  async findAll(): Promise<HabilidadJugadorResponseDto[]> {
    const relaciones = await this.relacionesRepository.find({
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
    const saved = await this.relacionesRepository.save(relacion);
    return HabilidadJugadorMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.relacionesRepository.remove(relacion);
    return { message: `HabilidadJugador #${id} deleted successfully` };
  }

  private async findRelacion(id: string): Promise<HabilidadJugador> {
    const relacion = await this.relacionesRepository.findOne({
      where: { id },
      relations: { habilidad: true, jugador: true },
    });
    if (!relacion) {
      throw new NotFoundException(`HabilidadJugador with id ${id} not found`);
    }
    return relacion;
  }

  private async findHabilidad(id: string): Promise<Habilidad> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
    });
    if (!habilidad) {
      throw new NotFoundException(`Habilidad with id ${id} not found`);
    }
    return habilidad;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
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
      throw new ConflictException(
        'This habilidad is already assigned to this jugador',
      );
    }
  }
}
