import { CreateJugadorDto } from '../dto/create-jugador.dto';
import { JugadorResponseDto } from '../dto/jugador-response.dto';
import { UpdateJugadorDto } from '../dto/update-jugador.dto';
import { Jugador } from '../entities/jugador.entity';

export class JugadorMapper {
  static toEntity(dto: CreateJugadorDto): Jugador {
    return Object.assign(new Jugador(), {
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      fecha_nacimiento: dto.fecha_nacimiento,
      nacionalidad: dto.nacionalidad,
    });
  }

  static mergeEntity(entity: Jugador, dto: UpdateJugadorDto): Jugador {
    if (dto.nombres !== undefined) entity.nombres = dto.nombres;
    if (dto.apellidos !== undefined) entity.apellidos = dto.apellidos;
    if (dto.fecha_nacimiento !== undefined) {
      entity.fecha_nacimiento = dto.fecha_nacimiento;
    }
    if (dto.nacionalidad !== undefined) entity.nacionalidad = dto.nacionalidad;
    return entity;
  }

  static toResponseDto(entity: Jugador): JugadorResponseDto {
    return {
      id: entity.id,
      nombres: entity.nombres,
      apellidos: entity.apellidos,
      fecha_nacimiento: entity.fecha_nacimiento,
      nacionalidad: entity.nacionalidad,
    };
  }

  static toResponseDtoList(entities: Jugador[]): JugadorResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
