import { PartialType } from '@nestjs/mapped-types';
import { CreateApuestaDto } from './create-apuesta.dto';

export class UpdateApuestaDto extends PartialType(CreateApuestaDto) {}
