import { EscenarioTorneoResponseDto } from '../../escenarios-torneo/dto/escenario-torneo-response.dto';
import { LocalidadResponseDto } from '../../localidades/dto/localidad-response.dto';
import { PartidoResponseDto } from '../../partidos/dto/partido-response.dto';

export class EscenarioResponseDto {
  id!: string;
  nombre!: string;
  direccion!: string;
  capacidad!: number;
  escenario_padre_id!: string | null;
  sub_escenarios?: EscenarioResponseDto[];
  localidades?: LocalidadResponseDto[];
  partidos?: PartidoResponseDto[];
  escenarios_torneo?: EscenarioTorneoResponseDto[];
}
