import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { CreateEquipoJugadorDto } from './dto/create-equipo-jugador.dto';
import { EquipoJugadorResponseDto } from './dto/equipo-jugador-response.dto';
import { UpdateEquipoJugadorDto } from './dto/update-equipo-jugador.dto';
import { EquipoJugador } from './entities/equipo-jugador.entity';
import { EquipoJugadorMapper } from './mappers/equipo-jugador.mapper';

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
    const saved = await this.equipoJugadorRepository.save(
      EquipoJugadorMapper.toEntity(dto, equipo, jugador),
    );
    return EquipoJugadorMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EquipoJugadorResponseDto[]> {
    const relaciones = await this.equipoJugadorRepository.find({
      relations: { equipo: true, jugador: true },
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
    if (dto.equipo_id !== undefined) {
      relacion.equipo = await this.findEquipo(dto.equipo_id);
    }
    if (dto.jugador_id !== undefined) {
      relacion.jugador = await this.findJugador(dto.jugador_id);
    }
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

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.equipoJugadorRepository.remove(relacion);
    return { message: `EquipoJugador #${id} deleted successfully` };
  }

  private validateDates(fechaInicio: string, fechaFin?: string | null): void {
    if (fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'fecha_fin must be equal to or later than fecha_inicio',
      );
    }
  }

  private async findRelacion(id: string): Promise<EquipoJugador> {
    const relacion = await this.equipoJugadorRepository.findOne({
      where: { id },
      relations: { equipo: true, jugador: true },
    });
    if (!relacion) {
      throw new NotFoundException(`EquipoJugador with id ${id} not found`);
    }
    return relacion;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    return equipo;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    return jugador;
  }
}
