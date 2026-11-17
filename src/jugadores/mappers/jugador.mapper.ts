import { CreateJugadorDto } from '../dto/create-jugador.dto';
import { JugadorResponseDto } from '../dto/jugador-response.dto';
import { UpdateJugadorDto } from '../dto/update-jugador.dto';
import { Jugador } from '../entities/jugador.entity';

export class JugadorMapper {
  static toEntity(dto: CreateJugadorDto): Jugador {
    return Object.assign(new Jugador(), {
      user_id: dto.user_id,
      fecha_nacimiento: dto.fecha_nacimiento,
      nacionalidad: dto.nacionalidad,
      activo: dto.activo ?? true,
    });
  }

  static mergeEntity(entity: Jugador, dto: UpdateJugadorDto): Jugador {
    if (dto.fecha_nacimiento !== undefined) {
      entity.fecha_nacimiento = dto.fecha_nacimiento;
    }
    if (dto.nacionalidad !== undefined) entity.nacionalidad = dto.nacionalidad;
    if (dto.activo !== undefined) entity.activo = dto.activo;
    return entity;
  }

  static toResponseDto(entity: Jugador): JugadorResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      fecha_nacimiento: entity.fecha_nacimiento,
      nacionalidad: entity.nacionalidad,
      activo: entity.activo,
    };
  }

  static toResponseDtoList(entities: Jugador[]): JugadorResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
