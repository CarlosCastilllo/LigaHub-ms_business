import { EquipoDeporteResponseDto } from '../dto/equipo-deporte-response.dto';
import { EquipoDeporte } from '../entities/equipo-deporte.entity';

export class EquipoDeporteMapper {
  static toEntity(
    equipo: EquipoDeporte['equipo'],
    deporte: EquipoDeporte['deporte'],
  ): EquipoDeporte {
    return Object.assign(new EquipoDeporte(), { equipo, deporte });
  }

  static toResponseDto(entity: EquipoDeporte): EquipoDeporteResponseDto {
    return {
      id: entity.id,
      equipo_id: entity.equipo?.id ?? entity.equipo_id,
      deporte_id: entity.deporte?.id ?? entity.deporte_id,
    };
  }

  static toResponseDtoList(entities: EquipoDeporte[]): EquipoDeporteResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
