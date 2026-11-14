import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDeporteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsOptional()
  @IsUUID()
  deporte_padre_id?: string | null;
}
