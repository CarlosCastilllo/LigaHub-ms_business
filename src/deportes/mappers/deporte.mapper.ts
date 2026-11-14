import { CreateDeporteDto } from '../dto/create-deporte.dto';
import { DeporteResponseDto } from '../dto/deporte-response.dto';
import { UpdateDeporteDto } from '../dto/update-deporte.dto';
import { Deporte } from '../entities/deporte.entity';

export class DeporteMapper {
  static toEntity(
    dto: CreateDeporteDto,
    deportePadre?: Deporte | null,
  ): Deporte {
    return Object.assign(new Deporte(), {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      deporte_padre: deportePadre ?? null,
    });
  }

  static mergeEntity(
    entity: Deporte,
    dto: UpdateDeporteDto,
  ): Deporte {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.descripcion !== undefined) entity.descripcion = dto.descripcion;
    return entity;
  }

  static toResponseDto(entity: Deporte): DeporteResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      deporte_padre_id:
        entity.deporte_padre?.id ?? entity.deporte_padre_id ?? null,
    };
  }

  static toResponseDtoList(entities: Deporte[]): DeporteResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
