import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDeporteDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsOptional()
  @IsUUID()
  deporte_padre_id?: string | null;
}
