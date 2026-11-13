import { PartialType } from '@nestjs/mapped-types';
import { CreateEscenarioDto } from './create-escenario.dto';

export class UpdateEscenarioDto extends PartialType(CreateEscenarioDto) {}
