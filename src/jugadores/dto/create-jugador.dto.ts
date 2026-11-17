import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateJugadorDto {
  @IsInt()
  @Min(1)
  user_id!: number;

  @IsDateString({ strict: true })
  fecha_nacimiento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nacionalidad!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
