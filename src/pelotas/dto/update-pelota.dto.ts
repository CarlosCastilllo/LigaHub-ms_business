import { PartialType } from '@nestjs/mapped-types';
import { CreatePelotaDto } from './create-pelota.dto';

export class UpdatePelotaDto extends PartialType(CreatePelotaDto) {}
