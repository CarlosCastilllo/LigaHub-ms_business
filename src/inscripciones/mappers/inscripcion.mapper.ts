import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { InscripcionResponseDto } from '../dto/inscripcion-response.dto';
import { UpdateInscripcionDto } from '../dto/update-inscripcion.dto';
import { Inscripcion } from '../entities/inscripcion.entity';

export class InscripcionMapper {
  static toEntity(
    dto: CreateInscripcionDto,
    torneo: Inscripcion['torneo'],
  ): Inscripcion {
    return Object.assign(new Inscripcion(), {
      fecha_inscripcion: dto.fecha_inscripcion,
      estado: dto.estado,
      equipo_id: dto.equipo_id,
      torneo,
    });
  }

  static mergeEntity(
    entity: Inscripcion,
    dto: UpdateInscripcionDto,
  ): Inscripcion {
    if (dto.fecha_inscripcion !== undefined) {
      entity.fecha_inscripcion = dto.fecha_inscripcion;
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.equipo_id !== undefined) entity.equipo_id = dto.equipo_id;
    return entity;
  }

  static toResponseDto(entity: Inscripcion): InscripcionResponseDto {
    return {
      id: entity.id,
      fecha_inscripcion: entity.fecha_inscripcion,
      estado: entity.estado,
      equipo_id: entity.equipo_id,
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };
  }

  static toResponseDtoList(entities: Inscripcion[]): InscripcionResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
