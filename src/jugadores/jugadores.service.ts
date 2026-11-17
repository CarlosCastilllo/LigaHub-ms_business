import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { JugadorResponseDto } from './dto/jugador-response.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Jugador } from './entities/jugador.entity';
import { JugadorMapper } from './mappers/jugador.mapper';

@Injectable()
export class JugadoresService {
  constructor(
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
    private readonly securityUsers: SecurityUsersClient,
  ) {}

  async create(
    dto: CreateJugadorDto,
    authorization?: string,
  ): Promise<JugadorResponseDto> {
    this.assertFechaNoFutura(dto.fecha_nacimiento);
    await this.assertUserSinJugador(dto.user_id);
    await this.securityUsers.assertUserExists(dto.user_id, authorization);
    try {
      const saved = await this.jugadoresRepository.save(
        JugadorMapper.toEntity(dto),
      );
      return JugadorMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw this.duplicado(dto.user_id);
      }
      throw error;
    }
  }

  async findAll(): Promise<JugadorResponseDto[]> {
    const jugadores = await this.jugadoresRepository.find();
    return JugadorMapper.toResponseDtoList(jugadores);
  }

  async findOne(id: string): Promise<JugadorResponseDto> {
    return JugadorMapper.toResponseDto(await this.findJugador(id));
  }

  async update(
    id: string,
    dto: UpdateJugadorDto,
  ): Promise<JugadorResponseDto> {
    const jugador = await this.findJugador(id);
    if (dto.fecha_nacimiento !== undefined) {
      this.assertFechaNoFutura(dto.fecha_nacimiento);
    }
    const saved = await this.jugadoresRepository.save(
      JugadorMapper.mergeEntity(jugador, dto),
    );
    return JugadorMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const jugador = await this.jugadoresRepository.findOne({
      where: { id },
      relations: {
        anotaciones: true,
        posiciones_espaciales: true,
        equipos_jugador: true,
        habilidades_jugador: true,
      },
    });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    if (
      jugador.anotaciones?.length ||
      jugador.posiciones_espaciales?.length ||
      jugador.equipos_jugador?.length ||
      jugador.habilidades_jugador?.length
    ) {
      throw new ConflictException(
        `Jugador #${id} has anotaciones, posiciones espaciales, equipo history or habilidades; delete or reassign them first, or deactivate it instead`,
      );
    }
    await this.jugadoresRepository.remove(jugador);
    return { message: `Jugador #${id} deleted successfully` };
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    return jugador;
  }

  private async assertUserSinJugador(userId: number): Promise<void> {
    const existente = await this.jugadoresRepository.findOne({
      where: { user_id: userId },
    });
    if (existente) throw this.duplicado(userId);
  }

  private duplicado(userId: number): ConflictException {
    return new ConflictException(`A jugador for user ${userId} already exists`);
  }

  private assertFechaNoFutura(fecha: string): void {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha > hoy) {
      throw new BadRequestException('fecha_nacimiento cannot be in the future');
    }
  }
}
