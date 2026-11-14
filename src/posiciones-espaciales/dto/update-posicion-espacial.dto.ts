import { PartialType } from '@nestjs/mapped-types';
import { CreatePosicionEspacialDto } from './create-posicion-espacial.dto';

export class UpdatePosicionEspacialDto extends PartialType(
  CreatePosicionEspacialDto,
) {}
