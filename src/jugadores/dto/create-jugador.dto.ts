import {
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateJugadorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos!: string;

  @IsDateString({ strict: true })
  fecha_nacimiento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nacionalidad!: string;
}
