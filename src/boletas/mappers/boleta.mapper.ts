import { BoletaResponseDto } from '../dto/boleta-response.dto';
import { CreateBoletaDto } from '../dto/create-boleta.dto';
import { UpdateBoletaDto } from '../dto/update-boleta.dto';
import { Boleta, EstadoBoleta } from '../entities/boleta.entity';

export class BoletaMapper {
  static toEntity(
    dto: CreateBoletaDto,
    aficionado: Boleta['aficionado'],
    partido: Boleta['partido'],
    localidad: Boleta['localidad'],
  ): Boleta {
    return Object.assign(new Boleta(), {
      precio: dto.precio ?? localidad.precio,
      estado: dto.estado ?? EstadoBoleta.ACTIVA,
      aficionado,
      partido,
      localidad,
    });
  }

  // Las relaciones las reasigna el service despues de validarlas.
  static mergeEntity(entity: Boleta, dto: UpdateBoletaDto): Boleta {
    if (dto.precio !== undefined) entity.precio = dto.precio;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(entity: Boleta): BoletaResponseDto {
    return {
      id: entity.id,
      fecha_compra: entity.fecha_compra,
      precio: entity.precio,
      estado: entity.estado,
      aficionado_id: entity.aficionado?.id ?? entity.aficionado_id,
      partido_id: entity.partido?.id ?? entity.partido_id,
      localidad_id: entity.localidad?.id ?? entity.localidad_id,
    };
  }

  static toResponseDtoList(entities: Boleta[]): BoletaResponseDto[] {
    return entities.map((entity) => BoletaMapper.toResponseDto(entity));
  }
}
