import { CreateEscenarioTorneoDto } from '../dto/create-escenario-torneo.dto';
import { EscenarioTorneoResponseDto } from '../dto/escenario-torneo-response.dto';
import { UpdateEscenarioTorneoDto } from '../dto/update-escenario-torneo.dto';
import { EscenarioTorneo } from '../entities/escenario-torneo.entity';

export class EscenarioTorneoMapper {
  static toEntity(
    dto: CreateEscenarioTorneoDto,
    torneo: EscenarioTorneo['torneo'],
    escenario: EscenarioTorneo['escenario'],
  ): EscenarioTorneo {
    return Object.assign(new EscenarioTorneo(), {
      fecha_asignacion: dto.fecha_asignacion,
      estado: dto.estado,
      torneo,
      escenario,
    });
  }

  // Las relaciones (torneo y escenario) las reasigna el service
  // despues de validar que existan.
  static mergeEntity(
    entity: EscenarioTorneo,
    dto: UpdateEscenarioTorneoDto,
  ): EscenarioTorneo {
    if (dto.fecha_asignacion !== undefined) {
      entity.fecha_asignacion = dto.fecha_asignacion;
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(entity: EscenarioTorneo): EscenarioTorneoResponseDto {
    return {
      id: entity.id,
      fecha_asignacion: entity.fecha_asignacion,
      estado: entity.estado,
      escenario_id: entity.escenario?.id ?? entity.escenario_id,
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };
  }

  static toResponseDtoList(
    entities: EscenarioTorneo[],
  ): EscenarioTorneoResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
