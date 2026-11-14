import { Injectable } from '@nestjs/common';
import { CreateTorneoDto } from '../dto/create-torneo.dto';
import { TorneoResponseDto } from '../dto/torneo-response.dto';
import { UpdateTorneoDto } from '../dto/update-torneo.dto';
import { Torneo } from '../entities/torneo.entity';

@Injectable()
export class TorneoMapper {
  toEntity(dto: CreateTorneoDto): Torneo {
    const { deporte_id: _deporte_id, ...attributes } = dto;
    return Object.assign(new Torneo(), attributes);
  }

  mergeEntity(entity: Torneo, dto: UpdateTorneoDto): Torneo {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.descripcion !== undefined) entity.descripcion = dto.descripcion;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.max_equipos !== undefined) entity.max_equipos = dto.max_equipos;
    return entity;
  }

  toResponseDto(entity: Torneo): TorneoResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      estado: entity.estado,
      max_equipos: entity.max_equipos,
      deporte_id: entity.deporte?.id ?? entity.deporte_id,
    };
  }

  toResponseDtoList(entities: Torneo[]): TorneoResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
