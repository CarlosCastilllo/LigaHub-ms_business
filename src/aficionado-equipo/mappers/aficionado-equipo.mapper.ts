import { CreateAficionadoEquipoDto } from '../dto/create-aficionado-equipo.dto';
import { AficionadoEquipoResponseDto } from '../dto/aficionado-equipo-response.dto';
import { AficionadoEquipo } from '../entities/aficionado-equipo.entity';

export class AficionadoEquipoMapper {
  static toEntity(
    dto: CreateAficionadoEquipoDto,
    aficionado: AficionadoEquipo['aficionado'],
    equipo: AficionadoEquipo['equipo'],
  ): AficionadoEquipo {
    return Object.assign(new AficionadoEquipo(), { aficionado, equipo });
  }

  static toResponseDto(
    entity: AficionadoEquipo,
  ): AficionadoEquipoResponseDto {
    return {
      id: entity.id,
      aficionado_id: entity.aficionado?.id ?? entity.aficionado_id,
      equipo_id: entity.equipo?.id ?? entity.equipo_id,
    };
  }

  static toResponseDtoList(
    entities: AficionadoEquipo[],
  ): AficionadoEquipoResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
