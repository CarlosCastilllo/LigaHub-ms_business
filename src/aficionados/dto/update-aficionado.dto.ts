import { PartialType } from '@nestjs/mapped-types';
import { CreateAficionadoDto } from './create-aficionado.dto';

export class UpdateAficionadoDto extends PartialType(CreateAficionadoDto) {}
