import { MetodoPagoAficionadoMapper } from '../../metodos-pago-aficionado/mappers/metodo-pago-aficionado.mapper';
import { CreateMetodoPagoDto } from '../dto/create-metodo-pago.dto';
import { MetodoPagoResponseDto } from '../dto/metodo-pago-response.dto';
import { UpdateMetodoPagoDto } from '../dto/update-metodo-pago.dto';
import { MetodoPago } from '../entities/metodo-pago.entity';

export class MetodoPagoMapper {
  static toEntity(dto: CreateMetodoPagoDto): MetodoPago {
    return Object.assign(new MetodoPago(), {
      nombre: dto.nombre,
      tipo: dto.tipo,
      activo: dto.activo ?? true,
    });
  }

  static mergeEntity(
    entity: MetodoPago,
    dto: UpdateMetodoPagoDto,
  ): MetodoPago {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.tipo !== undefined) entity.tipo = dto.tipo;
    if (dto.activo !== undefined) entity.activo = dto.activo;
    return entity;
  }

  static toResponseDto(entity: MetodoPago): MetodoPagoResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      tipo: entity.tipo,
      activo: entity.activo,
      metodos_pago_aficionado: entity.metodos_pago_aficionado
        ? MetodoPagoAficionadoMapper.toResponseDtoList(
            entity.metodos_pago_aficionado,
          )
        : undefined,
    };
  }

  static toResponseDtoList(entities: MetodoPago[]): MetodoPagoResponseDto[] {
    return entities.map((entity) => MetodoPagoMapper.toResponseDto(entity));
  }
}
