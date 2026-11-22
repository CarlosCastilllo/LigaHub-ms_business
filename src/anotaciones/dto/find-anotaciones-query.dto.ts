import { IsOptional, IsUUID } from 'class-validator';

export class FindAnotacionesQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'El partido no es válido' })
  partido_id?: string;
}
