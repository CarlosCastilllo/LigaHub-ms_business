import { CreateEquipoDto } from '../dto/create-equipo.dto';
import { EquipoResponseDto } from '../dto/equipo-response.dto';
import { UpdateEquipoDto } from '../dto/update-equipo.dto';
import { Equipo } from '../entities/equipo.entity';

export class EquipoMapper {
  static toEntity(dto: CreateEquipoDto): Equipo {
    return Object.assign(new Equipo(), {
      nombre: dto.nombre,
      fase_grupos_id: dto.fase_grupos_id ?? null,
      activo: dto.activo ?? true,
    });
  }

  static mergeEntity(entity: Equipo, dto: UpdateEquipoDto): Equipo {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.fase_grupos_id !== undefined) {
      entity.fase_grupos_id = dto.fase_grupos_id;
    }
    if (dto.activo !== undefined) entity.activo = dto.activo;
    return entity;
  }

  static toResponseDto(entity: Equipo): EquipoResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      fase_grupos_id: entity.fase_grupos_id ?? null,
      activo: entity.activo,
    };
  }

  static toResponseDtoList(entities: Equipo[]): EquipoResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
