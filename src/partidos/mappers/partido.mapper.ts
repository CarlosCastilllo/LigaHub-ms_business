import { AnotacionMapper } from '../../anotaciones/mappers/anotacion.mapper';
import { ApuestaMapper } from '../../apuestas/mappers/apuesta.mapper';
import { BoletaMapper } from '../../boletas/mappers/boleta.mapper';
import { PelotaMapper } from '../../pelotas/mappers/pelota.mapper';
import { CreatePartidoDto } from '../dto/create-partido.dto';
import { PartidoResponseDto } from '../dto/partido-response.dto';
import { UpdatePartidoDto } from '../dto/update-partido.dto';
import { EstadoPartido, Partido } from '../entities/partido.entity';

export class PartidoMapper {
  static toEntity(
    dto: CreatePartidoDto,
    escenario: Partido['escenario'],
  ): Partido {
    return Object.assign(new Partido(), {
      fecha_hora: new Date(dto.fecha_hora),
      estado: dto.estado ?? EstadoPartido.PROGRAMADO,
      equipo_local_id: dto.equipo_local_id,
      equipo_visitante_id: dto.equipo_visitante_id,
      goles_local: dto.goles_local ?? 0,
      goles_visitante: dto.goles_visitante ?? 0,
      escenario,
    });
  }

  // El escenario lo reasigna el service despues de validar que exista.
  static mergeEntity(entity: Partido, dto: UpdatePartidoDto): Partido {
    if (dto.fecha_hora !== undefined) {
      entity.fecha_hora = new Date(dto.fecha_hora);
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.equipo_local_id !== undefined) {
      entity.equipo_local_id = dto.equipo_local_id;
    }
    if (dto.equipo_visitante_id !== undefined) {
      entity.equipo_visitante_id = dto.equipo_visitante_id;
    }
    if (dto.goles_local !== undefined) entity.goles_local = dto.goles_local;
    if (dto.goles_visitante !== undefined) {
      entity.goles_visitante = dto.goles_visitante;
    }
    return entity;
  }

  static toResponseDto(entity: Partido): PartidoResponseDto {
    return {
      id: entity.id,
      fecha_hora: entity.fecha_hora,
      estado: entity.estado,
      equipo_local_id: entity.equipo_local_id,
      equipo_visitante_id: entity.equipo_visitante_id,
      goles_local: entity.goles_local,
      goles_visitante: entity.goles_visitante,
      escenario_id: entity.escenario?.id ?? entity.escenario_id,
      boletas: entity.boletas
        ? BoletaMapper.toResponseDtoList(entity.boletas)
        : undefined,
      apuestas: entity.apuestas
        ? ApuestaMapper.toResponseDtoList(entity.apuestas)
        : undefined,
      anotaciones: entity.anotaciones
        ? AnotacionMapper.toResponseDtoList(entity.anotaciones)
        : undefined,
      pelota: entity.pelota
        ? PelotaMapper.toResponseDto(entity.pelota)
        : undefined,
    };
  }

  static toResponseDtoList(entities: Partido[]): PartidoResponseDto[] {
    return entities.map((entity) => PartidoMapper.toResponseDto(entity));
  }
}
