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
import { EquipoMapper } from '../equipos/mappers/equipo.mapper';
import { HabilidadMapper } from '../habilidades/mappers/habilidad.mapper';
import { PerfilJugadorDto } from './dto/perfil-jugador.dto';

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

  async findPerfil(id: string): Promise<PerfilJugadorDto> {
    const jugador = await this.jugadoresRepository.findOne({
      where: { id },
      relations: {
        equipos_jugador: { equipo: true },
        habilidades_jugador: { habilidad: true },
      },
    });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }

    const equipos = (jugador.equipos_jugador ?? [])
      .filter((relacion) => relacion.equipo)
      .map((relacion) => ({
        relacion_id: relacion.id,
        equipo_id: relacion.equipo_id,
        nombre: relacion.equipo.nombre,
        fecha_inicio: relacion.fecha_inicio,
        fecha_fin: relacion.fecha_fin ?? null,
        activo: relacion.activo,
        equipo: EquipoMapper.toResponseDto(relacion.equipo),
      }));

    const habilidades = (jugador.habilidades_jugador ?? [])
      .filter((relacion) => relacion.habilidad)
      .map((relacion) => ({
        relacion_id: relacion.id,
        habilidad_id: relacion.habilidad_id,
        habilidad: HabilidadMapper.toResponseDto(relacion.habilidad),
      }));

    return {
      jugador: JugadorMapper.toResponseDto(jugador),
      equipos,
      habilidades,
    };
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
      throw new NotFoundException('El jugador no fue encontrado');
    }
    if (
      jugador.anotaciones?.length ||
      jugador.posiciones_espaciales?.length ||
      jugador.equipos_jugador?.length ||
      jugador.habilidades_jugador?.length
    ) {
      throw new ConflictException(
        `El jugador asociado al usuario ${jugador.user_id} tiene anotaciones, posiciones espaciales, historial de equipos o habilidades. Elimine o reasigne esas relaciones o desactívelo`,
      );
    }
    await this.jugadoresRepository.remove(jugador);
    return { message: `Se eliminó el jugador asociado al usuario ${jugador.user_id} correctamente` };
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
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
    return new ConflictException(
      `Ya existe un jugador asociado al usuario ${userId}`,
    );
  }

  private assertFechaNoFutura(fecha: string): void {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura',
      );
    }
  }
}
