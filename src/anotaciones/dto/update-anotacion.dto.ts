import { PartialType } from '@nestjs/mapped-types';
import { CreateAnotacionDto } from './create-anotacion.dto';

export class UpdateAnotacionDto extends PartialType(CreateAnotacionDto) {}
