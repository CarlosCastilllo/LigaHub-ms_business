import { ApuestaResponseDto } from '../dto/apuesta-response.dto';
import { CreateApuestaDto } from '../dto/create-apuesta.dto';
import { UpdateApuestaDto } from '../dto/update-apuesta.dto';
import { Apuesta, EstadoApuesta } from '../entities/apuesta.entity';

export class ApuestaMapper {
  static toEntity(
    dto: CreateApuestaDto,
    aficionado: Apuesta['aficionado'],
    partido: Apuesta['partido'],
    metodoPagoAficionado: Apuesta['metodo_pago_aficionado'],
  ): Apuesta {
    return Object.assign(new Apuesta(), {
      monto: dto.monto,
      pronostico: dto.pronostico,
      cuota: dto.cuota,
      estado: dto.estado ?? EstadoApuesta.PENDIENTE,
      aficionado,
      partido,
      metodo_pago_aficionado: metodoPagoAficionado,
    });
  }

  // Las relaciones las reasigna el service despues de validarlas.
  static mergeEntity(entity: Apuesta, dto: UpdateApuestaDto): Apuesta {
    if (dto.monto !== undefined) entity.monto = dto.monto;
    if (dto.pronostico !== undefined) entity.pronostico = dto.pronostico;
    if (dto.cuota !== undefined) entity.cuota = dto.cuota;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  static toResponseDto(entity: Apuesta): ApuestaResponseDto {
    return {
      id: entity.id,
      fecha_apuesta: entity.fecha_apuesta,
      monto: entity.monto,
      pronostico: entity.pronostico,
      cuota: entity.cuota,
      estado: entity.estado,
      aficionado_id: entity.aficionado?.id ?? entity.aficionado_id,
      partido_id: entity.partido?.id ?? entity.partido_id,
      metodo_pago_aficionado_id:
        entity.metodo_pago_aficionado?.id ?? entity.metodo_pago_aficionado_id,
    };
  }

  static toResponseDtoList(entities: Apuesta[]): ApuestaResponseDto[] {
    return entities.map((entity) => ApuestaMapper.toResponseDto(entity));
  }
}
