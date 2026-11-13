import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEscenarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion!: string;

  @IsInt()
  @Min(1)
  capacidad!: number;

  // Opcional: ausente o null = escenario raiz. En PATCH, null quita el padre.
  @IsOptional()
  @IsUUID()
  escenario_padre_id?: string | null;
}
