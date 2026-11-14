import { CreateHabilidadDto } from '../dto/create-habilidad.dto';
import { HabilidadResponseDto } from '../dto/habilidad-response.dto';
import { UpdateHabilidadDto } from '../dto/update-habilidad.dto';
import { Habilidad } from '../entities/habilidad.entity';

export class HabilidadMapper {
  static toEntity(dto: CreateHabilidadDto): Habilidad {
    return Object.assign(new Habilidad(), dto);
  }

  static mergeEntity(
    entity: Habilidad,
    dto: UpdateHabilidadDto,
  ): Habilidad {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.descripcion !== undefined) entity.descripcion = dto.descripcion;
    return entity;
  }

  static toResponseDto(entity: Habilidad): HabilidadResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
    };
  }

  static toResponseDtoList(entities: Habilidad[]): HabilidadResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
