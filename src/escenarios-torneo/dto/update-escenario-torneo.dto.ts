import { PartialType } from '@nestjs/mapped-types';
import { CreateEscenarioTorneoDto } from './create-escenario-torneo.dto';

export class UpdateEscenarioTorneoDto extends PartialType(
  CreateEscenarioTorneoDto,
) {}
