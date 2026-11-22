import { Escenario } from '../../escenarios/entities/escenario.entity';
import { AnotacionMapper } from '../../anotaciones/mappers/anotacion.mapper';
import { ApuestaMapper } from '../../apuestas/mappers/apuesta.mapper';
import { BoletaMapper } from '../../boletas/mappers/boleta.mapper';
import { PelotaMapper } from '../../pelotas/mappers/pelota.mapper';
import { CreatePartidoDto } from '../dto/create-partido.dto';
import { PartidoResponseDto } from '../dto/partido-response.dto';
import { UpdatePartidoDto } from '../dto/update-partido.dto';
import { EstadoPartido, Partido } from '../entities/partido.entity';
import { TipoFase } from '../../fases/entities/fase.entity';
import { calcularMarcador } from '../marcador';

export class PartidoMapper {
  static toEntity(
    dto: CreatePartidoDto,
    escenario: Escenario | null,
    equipoLocal: Partido['equipo_local'],
    equipoVisitante: Partido['equipo_visitante'],
    fase: NonNullable<Partido['fase']>,
  ): Partido {
    return Object.assign(new Partido(), {
      fecha_hora: new Date(dto.fecha_hora),
      estado: dto.estado ?? EstadoPartido.PROGRAMADO,
      equipo_local: equipoLocal,
      equipo_visitante: equipoVisitante,
      fase,
      escenario,
    });
  }

  // El escenario lo reasigna el service despues de validar que exista.
  static mergeEntity(entity: Partido, dto: UpdatePartidoDto): Partido {
    if (dto.fecha_hora !== undefined) {
      entity.fecha_hora = new Date(dto.fecha_hora);
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(entity: Partido): PartidoResponseDto {
    return {
      id: entity.id,
      fecha_hora: entity.fecha_hora,
      estado: entity.estado,
      equipo_local_id: entity.equipo_local?.id ?? entity.equipo_local_id,
      equipo_visitante_id:
        entity.equipo_visitante?.id ?? entity.equipo_visitante_id,
      equipo_local_nombre: entity.equipo_local?.nombre ?? null,
      equipo_visitante_nombre: entity.equipo_visitante?.nombre ?? null,
      // HU-GC-07: el marcador se calcula a partir de las anotaciones (goles).
      ...calcularMarcador(entity),
      // escenario === null significa que se acaba de desasignar.
      escenario_id:
        entity.escenario !== undefined
          ? (entity.escenario?.id ?? null)
          : (entity.escenario_id ?? null),
      escenario_nombre: entity.escenario?.nombre ?? null,
      torneo_id: entity.fase?.torneo?.id ?? entity.fase?.torneo_id ?? null,
      fase_id: entity.fase?.id ?? entity.fase_id ?? null,
      fase_tipo: PartidoMapper.faseTipo(entity),
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

  // Solo se conoce el tipo si la fase se cargó con su detalle 1:1.
  private static faseTipo(entity: Partido): TipoFase | null {
    if (entity.fase?.final) return TipoFase.FINAL;
    if (entity.fase?.grupos) return TipoFase.GRUPOS;
    return null;
  }

  static toResponseDtoList(entities: Partido[]): PartidoResponseDto[] {
    return entities.map((entity) => PartidoMapper.toResponseDto(entity));
  }
}
