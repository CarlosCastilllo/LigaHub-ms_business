import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const NOMBRE_MAX = 150;
// Capacidad de una columna TEXT (65.535 bytes) con caracteres utf8mb4 de 4 bytes.
const DESCRIPCION_MAX = 16383;

export const IsNombreHabilidad = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsString(),
    IsNotEmpty(),
    MaxLength(NOMBRE_MAX),
  );

export const IsDescripcionHabilidad = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString(),
    IsNotEmpty(),
    MaxLength(DESCRIPCION_MAX),
  );

export class CreateHabilidadDto {
  @IsNombreHabilidad()
  nombre!: string;

  @IsDescripcionHabilidad()
  descripcion!: string;
}
