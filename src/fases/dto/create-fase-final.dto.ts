import { IsEnum, IsInt, Min } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class CreateFaseFinalDto extends CreateFaseDto {
  @IsInt()
  @Min(1)
  numero_partidos!: number;

  @IsEnum(ModalidadFinal)
  modalidad!: ModalidadFinal;
}
