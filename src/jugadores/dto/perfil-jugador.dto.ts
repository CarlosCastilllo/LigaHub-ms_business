import { HabilidadResponseDto } from '../../habilidades/dto/habilidad-response.dto';
import { EquipoResponseDto } from '../../equipos/dto/equipo-response.dto';
import { JugadorResponseDto } from './jugador-response.dto';

export class EquipoPerfilDto {
  relacion_id!: string;
  equipo_id!: string;
  nombre!: string;
  fecha_inicio!: string;
  fecha_fin!: string | null;
  activo!: boolean;
  equipo!: EquipoResponseDto;
}

export class HabilidadPerfilDto {
  relacion_id!: string;
  habilidad_id!: string;
  habilidad!: HabilidadResponseDto;
}

export class PerfilJugadorDto {
  jugador!: JugadorResponseDto;
  equipos!: EquipoPerfilDto[];
  habilidades!: HabilidadPerfilDto[];
}
