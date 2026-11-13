import { BoletaMapper } from '../../boletas/mappers/boleta.mapper';
import { CreateLocalidadDto } from '../dto/create-localidad.dto';
import { LocalidadResponseDto } from '../dto/localidad-response.dto';
import { UpdateLocalidadDto } from '../dto/update-localidad.dto';
import { Localidad } from '../entities/localidad.entity';

export class LocalidadMapper {
  static toEntity(
    dto: CreateLocalidadDto,
    escenario: Localidad['escenario'],
  ): Localidad {
    return Object.assign(new Localidad(), {
      nombre: dto.nombre,
      capacidad: dto.capacidad,
      precio: dto.precio,
      escenario,
    });
  }

  // El escenario lo reasigna el service despues de validar que exista.
  static mergeEntity(entity: Localidad, dto: UpdateLocalidadDto): Localidad {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.capacidad !== undefined) entity.capacidad = dto.capacidad;
    if (dto.precio !== undefined) entity.precio = dto.precio;
    return entity;
  }

  static toResponseDto(entity: Localidad): LocalidadResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      capacidad: entity.capacidad,
      precio: entity.precio,
      escenario_id: entity.escenario?.id ?? entity.escenario_id,
      boletas: entity.boletas
        ? BoletaMapper.toResponseDtoList(entity.boletas)
        : undefined,
    };
  }

  static toResponseDtoList(entities: Localidad[]): LocalidadResponseDto[] {
    return entities.map((entity) => LocalidadMapper.toResponseDto(entity));
  }
}
