import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { CreateAficionadoDto } from '../../dto/create-aficionado.dto';

// Formulario "Conviértete en aficionado": datos del aficionado y, de forma
// opcional, los equipos que quiere seguir desde el inicio.
export class ConvertirseAficionadoDto extends CreateAficionadoDto {
  @IsOptional()
  @IsArray({ message: 'equipo_ids debe ser una lista' })
  @ArrayUnique({ message: 'No se puede repetir un equipo en la lista' })
  @IsUUID('all', {
    each: true,
    message: 'Cada equipo debe tener un identificador válido',
  })
  equipo_ids?: string[];
}
