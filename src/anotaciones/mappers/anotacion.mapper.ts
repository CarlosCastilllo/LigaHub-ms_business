import { AnotacionResponseDto } from '../dto/anotacion-response.dto';
import { CreateAnotacionDto } from '../dto/create-anotacion.dto';
import { UpdateAnotacionDto } from '../dto/update-anotacion.dto';
import { Anotacion } from '../entities/anotacion.entity';

export class AnotacionMapper {
  static toEntity(
    dto: CreateAnotacionDto,
    partido: Anotacion['partido'],
    jugador: Anotacion['jugador'],
    equipo: Anotacion['equipo'],
  ): Anotacion {
    return Object.assign(new Anotacion(), {
      minuto: dto.minuto,
      descripcion: AnotacionMapper.descripcion(dto.descripcion) ?? null,
      partido,
      jugador,
      equipo,
    });
  }

  // El jugador y el equipo los reasigna el service despues de validarlos.
  static mergeEntity(entity: Anotacion, dto: UpdateAnotacionDto): Anotacion {
    if (dto.minuto !== undefined) entity.minuto = dto.minuto;
    const descripcion = AnotacionMapper.descripcion(dto.descripcion);
    if (descripcion !== undefined) entity.descripcion = descripcion;
    return entity;
  }

  static toResponseDto(entity: Anotacion): AnotacionResponseDto {
    return {
      id: entity.id,
      minuto: entity.minuto,
      descripcion: entity.descripcion ?? null,
      partido_id: entity.partido?.id ?? entity.partido_id,
      jugador_id: entity.jugador?.id ?? entity.jugador_id,
      equipo_id: entity.equipo?.id ?? entity.equipo_id,
    };
  }

  static toResponseDtoList(entities: Anotacion[]): AnotacionResponseDto[] {
    return entities.map((entity) => AnotacionMapper.toResponseDto(entity));
  }

  // Texto vacío se guarda como null; undefined significa "sin cambios".
  private static descripcion(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    const limpio = value?.trim() ?? '';
    return limpio === '' ? null : limpio;
  }
}
