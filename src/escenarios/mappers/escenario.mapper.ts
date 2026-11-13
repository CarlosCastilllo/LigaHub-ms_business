import { EscenarioTorneoMapper } from '../../escenarios-torneo/mappers/escenario-torneo.mapper';
import { LocalidadMapper } from '../../localidades/mappers/localidad.mapper';
import { PartidoMapper } from '../../partidos/mappers/partido.mapper';
import { CreateEscenarioDto } from '../dto/create-escenario.dto';
import { EscenarioResponseDto } from '../dto/escenario-response.dto';
import { UpdateEscenarioDto } from '../dto/update-escenario.dto';
import { Escenario } from '../entities/escenario.entity';

export class EscenarioMapper {
  static toEntity(
    dto: CreateEscenarioDto,
    escenarioPadre: Escenario | null,
  ): Escenario {
    return Object.assign(new Escenario(), {
      nombre: dto.nombre,
      direccion: dto.direccion,
      capacidad: dto.capacidad,
      escenario_padre: escenarioPadre,
    });
  }

  // El escenario padre lo reasigna el service despues de validarlo.
  static mergeEntity(entity: Escenario, dto: UpdateEscenarioDto): Escenario {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.direccion !== undefined) entity.direccion = dto.direccion;
    if (dto.capacidad !== undefined) entity.capacidad = dto.capacidad;
    return entity;
  }

  static toResponseDto(entity: Escenario): EscenarioResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      direccion: entity.direccion,
      capacidad: entity.capacidad,
      // Si la relacion esta cargada (o se acaba de cambiar) manda sobre el
      // @RelationId, que puede conservar el valor previo a la actualizacion.
      escenario_padre_id:
        entity.escenario_padre !== undefined
          ? (entity.escenario_padre?.id ?? null)
          : (entity.escenario_padre_id ?? null),
      sub_escenarios: entity.sub_escenarios
        ? EscenarioMapper.toResponseDtoList(entity.sub_escenarios)
        : undefined,
      localidades: entity.localidades
        ? LocalidadMapper.toResponseDtoList(entity.localidades)
        : undefined,
      partidos: entity.partidos
        ? PartidoMapper.toResponseDtoList(entity.partidos)
        : undefined,
      escenarios_torneo: entity.escenarios_torneo
        ? EscenarioTorneoMapper.toResponseDtoList(entity.escenarios_torneo)
        : undefined,
    };
  }

  static toResponseDtoList(entities: Escenario[]): EscenarioResponseDto[] {
    return entities.map((entity) => EscenarioMapper.toResponseDto(entity));
  }
}
