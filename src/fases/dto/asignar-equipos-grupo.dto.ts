import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AsignarEquiposGrupoDto {
  @IsArray({ message: 'Los equipos deben enviarse como una lista' })
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un equipo' })
  @ArrayUnique({ message: 'No se puede repetir el mismo equipo en la lista' })
  @IsUUID(undefined, {
    each: true,
    message: 'Alguno de los equipos seleccionados no es válido',
  })
  equipo_ids!: string[];
}
