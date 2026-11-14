import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateHabilidadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}
