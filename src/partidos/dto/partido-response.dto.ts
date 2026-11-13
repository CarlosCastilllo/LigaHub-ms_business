import { AnotacionResponseDto } from '../../anotaciones/dto/anotacion-response.dto';
import { ApuestaResponseDto } from '../../apuestas/dto/apuesta-response.dto';
import { BoletaResponseDto } from '../../boletas/dto/boleta-response.dto';
import { PelotaResponseDto } from '../../pelotas/dto/pelota-response.dto';
import { EstadoPartido } from '../entities/partido.entity';

export class PartidoResponseDto {
  id!: string;
  fecha_hora!: Date;
  estado!: EstadoPartido;
  equipo_local_id!: string;
  equipo_visitante_id!: string;
  goles_local!: number;
  goles_visitante!: number;
  escenario_id!: string;
  boletas?: BoletaResponseDto[];
  apuestas?: ApuestaResponseDto[];
  anotaciones?: AnotacionResponseDto[];
  pelota?: PelotaResponseDto;
}
