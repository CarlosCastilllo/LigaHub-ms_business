import { CreatePelotaDto } from '../dto/create-pelota.dto';
import { PelotaResponseDto } from '../dto/pelota-response.dto';
import { UpdatePelotaDto } from '../dto/update-pelota.dto';
import { EstadoPelota, Pelota } from '../entities/pelota.entity';

export class PelotaMapper {
  static toEntity(
    dto: CreatePelotaDto,
    partido: Pelota['partido'] | null,
  ): Pelota {
    return Object.assign(new Pelota(), {
      marca: dto.marca,
      modelo: dto.modelo,
      talla: dto.talla,
      estado: dto.estado ?? EstadoPelota.NUEVA,
      partido,
    });
  }

  // El partido lo asocia el service despues de validar que este disponible.
  static mergeEntity(entity: Pelota, dto: UpdatePelotaDto): Pelota {
    if (dto.marca !== undefined) entity.marca = dto.marca;
    if (dto.modelo !== undefined) entity.modelo = dto.modelo;
    if (dto.talla !== undefined) entity.talla = dto.talla;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(entity: Pelota): PelotaResponseDto {
    return {
      id: entity.id,
      marca: entity.marca,
      modelo: entity.modelo,
      talla: entity.talla,
      estado: entity.estado,
      // Si la relacion esta cargada (o se acaba de cambiar) manda sobre el
      // @RelationId, que puede conservar el valor previo a la actualizacion.
      partido_id:
        entity.partido !== undefined
          ? (entity.partido?.id ?? null)
          : (entity.partido_id ?? null),
    };
  }

  static toResponseDtoList(entities: Pelota[]): PelotaResponseDto[] {
    return entities.map((entity) => PelotaMapper.toResponseDto(entity));
  }
}
