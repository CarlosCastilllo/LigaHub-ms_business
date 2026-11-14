import { HabilidadJugadorResponseDto } from '../dto/habilidad-jugador-response.dto';
import { HabilidadJugador } from '../entities/habilidad-jugador.entity';

export class HabilidadJugadorMapper {
  static toEntity(
    habilidad: HabilidadJugador['habilidad'],
    jugador: HabilidadJugador['jugador'],
  ): HabilidadJugador {
    return Object.assign(new HabilidadJugador(), { habilidad, jugador });
  }

  static toResponseDto(
    entity: HabilidadJugador,
  ): HabilidadJugadorResponseDto {
    return {
      id: entity.id,
      habilidad_id: entity.habilidad?.id ?? entity.habilidad_id,
      jugador_id: entity.jugador?.id ?? entity.jugador_id,
    };
  }

  static toResponseDtoList(
    entities: HabilidadJugador[],
  ): HabilidadJugadorResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
