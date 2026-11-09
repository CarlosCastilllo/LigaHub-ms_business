import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFaseFinalDto } from '../dto/create-fase-final.dto';
import { CreateFaseGruposDto } from '../dto/create-fase-grupos.dto';
import { TipoFase } from '../entities/fase.entity';

export type CreateFaseInput = CreateFaseGruposDto | CreateFaseFinalDto;

@Injectable()
export class CreateFaseValidationPipe implements PipeTransform<
  unknown,
  Promise<CreateFaseInput>
> {
  async transform(value: unknown): Promise<CreateFaseInput> {
    if (typeof value !== 'object' || value === null || !('tipo' in value)) {
      throw new BadRequestException('El cuerpo debe incluir el campo tipo');
    }

    let dto: CreateFaseInput;
    if (value.tipo === TipoFase.GRUPOS) {
      dto = plainToInstance(CreateFaseGruposDto, value);
    } else if (value.tipo === TipoFase.FINAL) {
      dto = plainToInstance(CreateFaseFinalDto, value);
    } else {
      throw new BadRequestException('tipo debe ser GRUPOS o FINAL');
    }

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }
}
