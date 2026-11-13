import { ApuestaMapper } from '../../apuestas/mappers/apuesta.mapper';
import { CreateMetodoPagoAficionadoDto } from '../dto/create-metodo-pago-aficionado.dto';
import { MetodoPagoAficionadoResponseDto } from '../dto/metodo-pago-aficionado-response.dto';
import { UpdateMetodoPagoAficionadoDto } from '../dto/update-metodo-pago-aficionado.dto';
import {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from '../entities/metodo-pago-aficionado.entity';

export class MetodoPagoAficionadoMapper {
  static toEntity(
    dto: CreateMetodoPagoAficionadoDto,
    aficionado: MetodoPagoAficionado['aficionado'],
    metodoPago: MetodoPagoAficionado['metodo_pago'],
  ): MetodoPagoAficionado {
    return Object.assign(new MetodoPagoAficionado(), {
      referencia: dto.referencia,
      predeterminado: dto.predeterminado ?? false,
      estado: dto.estado ?? EstadoMetodoPagoAficionado.ACTIVO,
      aficionado,
      metodo_pago: metodoPago,
    });
  }

  static mergeEntity(
    entity: MetodoPagoAficionado,
    dto: UpdateMetodoPagoAficionadoDto,
  ): MetodoPagoAficionado {
    if (dto.referencia !== undefined) entity.referencia = dto.referencia;
    if (dto.predeterminado !== undefined) {
      entity.predeterminado = dto.predeterminado;
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(
    entity: MetodoPagoAficionado,
  ): MetodoPagoAficionadoResponseDto {
    return {
      id: entity.id,
      referencia: entity.referencia,
      fecha_registro: entity.fecha_registro,
      predeterminado: entity.predeterminado,
      estado: entity.estado,
      aficionado_id: entity.aficionado?.id ?? entity.aficionado_id,
      metodo_pago_id: entity.metodo_pago?.id ?? entity.metodo_pago_id,
      apuestas: entity.apuestas
        ? ApuestaMapper.toResponseDtoList(entity.apuestas)
        : undefined,
    };
  }

  static toResponseDtoList(
    entities: MetodoPagoAficionado[],
  ): MetodoPagoAficionadoResponseDto[] {
    return entities.map((entity) =>
      MetodoPagoAficionadoMapper.toResponseDto(entity),
    );
  }
}
