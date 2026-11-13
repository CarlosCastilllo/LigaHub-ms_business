import { AnotacionResponseDto } from '../dto/anotacion-response.dto';
import { CreateAnotacionDto } from '../dto/create-anotacion.dto';
import { UpdateAnotacionDto } from '../dto/update-anotacion.dto';
import { Anotacion } from '../entities/anotacion.entity';

export class AnotacionMapper {
  static toEntity(
    dto: CreateAnotacionDto,
    partido: Anotacion['partido'],
  ): Anotacion {
    return Object.assign(new Anotacion(), {
      minuto: dto.minuto,
      descripcion: dto.descripcion,
      partido,
    });
  }

  // El partido lo reasigna el service despues de validarlo.
  static mergeEntity(entity: Anotacion, dto: UpdateAnotacionDto): Anotacion {
    if (dto.minuto !== undefined) entity.minuto = dto.minuto;
    if (dto.descripcion !== undefined) entity.descripcion = dto.descripcion;
    return entity;
  }

  static toResponseDto(entity: Anotacion): AnotacionResponseDto {
    return {
      id: entity.id,
      minuto: entity.minuto,
      descripcion: entity.descripcion,
      partido_id: entity.partido?.id ?? entity.partido_id,
    };
  }

  static toResponseDtoList(entities: Anotacion[]): AnotacionResponseDto[] {
    return entities.map((entity) => AnotacionMapper.toResponseDto(entity));
  }
}
