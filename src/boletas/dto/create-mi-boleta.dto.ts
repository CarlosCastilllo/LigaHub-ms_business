import { IsUUID } from 'class-validator';

/**
 * Compra de una boleta por el aficionado de la sesión (HU-C). El aficionado,
 * el precio y el estado los fija el servidor: enviarlos responde 400.
 */
export class CreateMiBoletaDto {
  @IsUUID()
  partido_id!: string;

  @IsUUID()
  localidad_id!: string;
}
