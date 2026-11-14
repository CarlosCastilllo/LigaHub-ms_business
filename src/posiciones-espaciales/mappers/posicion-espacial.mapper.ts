import { CreatePosicionEspacialDto } from '../dto/create-posicion-espacial.dto';
import { PosicionEspacialResponseDto } from '../dto/posicion-espacial-response.dto';
import { UpdatePosicionEspacialDto } from '../dto/update-posicion-espacial.dto';
import { PosicionEspacial } from '../entities/posicion-espacial.entity';

export class PosicionEspacialMapper {
  static toEntity(
    dto: CreatePosicionEspacialDto,
    jugador: PosicionEspacial['jugador'],
    pelota: PosicionEspacial['pelota'],
  ): PosicionEspacial {
    return Object.assign(new PosicionEspacial(), {
      x: dto.x,
      y: dto.y,
      tiempo_segundos: dto.tiempo_segundos,
      jugador,
      pelota,
    });
  }

  static mergeEntity(
    entity: PosicionEspacial,
    dto: UpdatePosicionEspacialDto,
  ): PosicionEspacial {
    if (dto.x !== undefined) entity.x = dto.x;
    if (dto.y !== undefined) entity.y = dto.y;
    if (dto.tiempo_segundos !== undefined) {
      entity.tiempo_segundos = dto.tiempo_segundos;
    }
    return entity;
  }

  static toResponseDto(
    entity: PosicionEspacial,
  ): PosicionEspacialResponseDto {
    return {
      id: entity.id,
      x: entity.x,
      y: entity.y,
      tiempo_segundos: entity.tiempo_segundos,
      jugador_id:
        entity.jugador !== undefined
          ? (entity.jugador?.id ?? null)
          : (entity.jugador_id ?? null),
      pelota_id:
        entity.pelota !== undefined
          ? (entity.pelota?.id ?? null)
          : (entity.pelota_id ?? null),
    };
  }

  static toResponseDtoList(
    entities: PosicionEspacial[],
  ): PosicionEspacialResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
