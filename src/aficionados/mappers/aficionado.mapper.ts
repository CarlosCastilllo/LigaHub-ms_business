import { ApuestaMapper } from '../../apuestas/mappers/apuesta.mapper';
import { BoletaMapper } from '../../boletas/mappers/boleta.mapper';
import { MetodoPagoAficionadoMapper } from '../../metodos-pago-aficionado/mappers/metodo-pago-aficionado.mapper';
import { AficionadoResponseDto } from '../dto/aficionado-response.dto';
import { CreateAficionadoDto } from '../dto/create-aficionado.dto';
import { UpdateAficionadoDto } from '../dto/update-aficionado.dto';
import { Aficionado } from '../entities/aficionado.entity';

export class AficionadoMapper {
  static toEntity(dto: CreateAficionadoDto): Aficionado {
    return Object.assign(new Aficionado(), {
      nombre: dto.nombre,
      documento: dto.documento,
      email: dto.email,
      telefono: dto.telefono ?? null,
    });
  }

  static mergeEntity(
    entity: Aficionado,
    dto: UpdateAficionadoDto,
  ): Aficionado {
    if (dto.nombre !== undefined) entity.nombre = dto.nombre;
    if (dto.documento !== undefined) entity.documento = dto.documento;
    if (dto.email !== undefined) entity.email = dto.email;
    if (dto.telefono !== undefined) entity.telefono = dto.telefono;
    return entity;
  }

  static toResponseDto(entity: Aficionado): AficionadoResponseDto {
    return {
      id: entity.id,
      nombre: entity.nombre,
      documento: entity.documento,
      email: entity.email,
      telefono: entity.telefono ?? null,
      boletas: entity.boletas
        ? BoletaMapper.toResponseDtoList(entity.boletas)
        : undefined,
      apuestas: entity.apuestas
        ? ApuestaMapper.toResponseDtoList(entity.apuestas)
        : undefined,
      metodos_pago_aficionado: entity.metodos_pago_aficionado
        ? MetodoPagoAficionadoMapper.toResponseDtoList(
            entity.metodos_pago_aficionado,
          )
        : undefined,
    };
  }

  static toResponseDtoList(entities: Aficionado[]): AficionadoResponseDto[] {
    return entities.map((entity) => AficionadoMapper.toResponseDto(entity));
  }
}
