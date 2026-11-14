import { CreateEquipoJugadorDto } from '../dto/create-equipo-jugador.dto';
import { EquipoJugadorResponseDto } from '../dto/equipo-jugador-response.dto';
import { UpdateEquipoJugadorDto } from '../dto/update-equipo-jugador.dto';
import { EquipoJugador } from '../entities/equipo-jugador.entity';

export class EquipoJugadorMapper {
  static toEntity(
    dto: CreateEquipoJugadorDto,
    equipo: EquipoJugador['equipo'],
    jugador: EquipoJugador['jugador'],
  ): EquipoJugador {
    return Object.assign(new EquipoJugador(), {
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: dto.fecha_fin ?? null,
      equipo,
      jugador,
    });
  }

  static mergeEntity(
    entity: EquipoJugador,
    dto: UpdateEquipoJugadorDto,
  ): EquipoJugador {
    if (dto.fecha_inicio !== undefined) {
      entity.fecha_inicio = dto.fecha_inicio;
    }
    if (dto.fecha_fin !== undefined) entity.fecha_fin = dto.fecha_fin;
    return entity;
  }

  static toResponseDto(
    entity: EquipoJugador,
  ): EquipoJugadorResponseDto {
    return {
      id: entity.id,
      fecha_inicio: entity.fecha_inicio,
      fecha_fin: entity.fecha_fin ?? null,
      equipo_id: entity.equipo?.id ?? entity.equipo_id,
      jugador_id: entity.jugador?.id ?? entity.jugador_id,
    };
  }

  static toResponseDtoList(
    entities: EquipoJugador[],
  ): EquipoJugadorResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
