import { IsInt, Min } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';

export class CreateFaseGruposDto extends CreateFaseDto {
  @IsInt()
  @Min(1)
  cantidad_grupos!: number;

  @IsInt()
  @Min(2)
  equipos_por_grupo!: number;
}
