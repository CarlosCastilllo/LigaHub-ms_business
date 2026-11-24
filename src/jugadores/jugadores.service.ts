import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { isReferencedRow } from '../common/database/is-referenced-row';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { JugadorResponseDto } from './dto/jugador-response.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Jugador } from './entities/jugador.entity';
import { JugadorMapper } from './mappers/jugador.mapper';
import { EquipoMapper } from '../equipos/mappers/equipo.mapper';
import { HabilidadMapper } from '../habilidades/mappers/habilidad.mapper';
import { PerfilJugadorDto } from './dto/perfil-jugador.dto';

const EDAD_MINIMA_JUGADOR = 14;

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
    this.assertFechaNacimientoValida(dto.fecha_nacimiento);
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
    if (
      dto.fecha_nacimiento !== undefined &&
      dto.fecha_nacimiento !== jugador.fecha_nacimiento
    ) {
      this.assertFechaNacimientoValida(dto.fecha_nacimiento);
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
        equipos_jugador: { equipo: true },
        habilidades_jugador: true,
      },
    });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }
    this.assertEliminable(jugador);

    const historialEquipos = jugador.equipos_jugador ?? [];
    const habilidadesAsignadas = jugador.habilidades_jugador ?? [];
    try {
      // El historial de equipos y las asignaciones de habilidades dependen del
      // jugador; las habilidades del catálogo no se tocan.
      await this.jugadoresRepository.manager.transaction(async (manager) => {
        if (historialEquipos.length) await manager.remove(historialEquipos);
        if (habilidadesAsignadas.length) {
          await manager.remove(habilidadesAsignadas);
        }
        await manager.remove(jugador);
      });
    } catch (error) {
      if (isReferencedRow(error)) {
        throw new ConflictException(
          `No se pudo eliminar el jugador asociado al usuario ${jugador.user_id} porque se registraron nuevos datos relacionados. Intente de nuevo`,
        );
      }
      throw error;
    }
    return { message: `Se eliminó el jugador asociado al usuario ${jugador.user_id} correctamente` };
  }

  private assertEliminable(jugador: Jugador): void {
    const prefijo = `No se puede eliminar el jugador asociado al usuario ${jugador.user_id}`;
    const contratoActivo = jugador.equipos_jugador?.find(
      (relacion) => relacion.activo,
    );
    if (contratoActivo) {
      throw new ConflictException(
        `${prefijo} porque tiene un contrato activo con el equipo "${contratoActivo.equipo?.nombre ?? contratoActivo.equipo_id}". Retírelo del equipo antes de eliminarlo`,
      );
    }

    const anotaciones = jugador.anotaciones?.length ?? 0;
    const posiciones = jugador.posiciones_espaciales?.length ?? 0;
    const registros: string[] = [];
    if (anotaciones) {
      registros.push(
        anotaciones === 1 ? '1 anotación' : `${anotaciones} anotaciones`,
      );
    }
    if (posiciones) {
      registros.push(
        posiciones === 1
          ? '1 posición espacial'
          : `${posiciones} posiciones espaciales`,
      );
    }
    if (registros.length) {
      throw new ConflictException(
        `${prefijo} porque tiene registros de partidos (${registros.join(' y ')}). Desactívelo en su lugar`,
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

  private async assertUserSinJugador(userId: number): Promise<void> {
    const existente = await this.jugadoresRepository.findOne({
      where: { user_id: userId },
    });
    if (existente) throw this.duplicado(userId);
  }

  private duplicado(userId: number): ConflictException {
    return new ConflictException(
      'Ya existe un jugador asociado al usuario seleccionado',
    );
  }

  private assertFechaNacimientoValida(fecha: string): void {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura',
      );
    }
    const anioLimite = Number(hoy.slice(0, 4)) - EDAD_MINIMA_JUGADOR;
    const fechaLimite = `${anioLimite}${hoy.slice(4)}`;
    if (fecha > fechaLimite) {
      throw new BadRequestException(
        `El jugador debe tener al menos ${EDAD_MINIMA_JUGADOR} años`,
      );
    }
  }
}
