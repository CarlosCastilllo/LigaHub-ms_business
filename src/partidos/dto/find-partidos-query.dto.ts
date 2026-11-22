import { IsOptional, IsUUID } from 'class-validator';

export class FindPartidosQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'La fase seleccionada no es válida' })
  fase_id?: string;
}
