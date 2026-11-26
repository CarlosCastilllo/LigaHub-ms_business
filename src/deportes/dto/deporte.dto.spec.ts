import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeporteDto } from './create-deporte.dto';
import { UpdateDeporteDto } from './update-deporte.dto';

async function erroresDe<T extends object>(
  dtoClass: new () => T,
  payload: object,
): Promise<string[]> {
  const errores = await validate(plainToInstance(dtoClass, payload));
  return errores.map(({ property }) => property);
}

describe('Deporte DTOs', () => {
  it('normalizes the spaces of nombre and descripcion', () => {
    const dto = plainToInstance(CreateDeporteDto, {
      nombre: '  Fútbol   sala ',
      descripcion: '  Deporte  de equipo ',
    });

    expect(dto.nombre).toBe('Fútbol sala');
    expect(dto.descripcion).toBe('Deporte  de equipo');
  });

  it('rejects values made only of spaces', async () => {
    await expect(
      erroresDe(CreateDeporteDto, { nombre: '   ', descripcion: '   ' }),
    ).resolves.toEqual(['nombre', 'descripcion']);
  });

  it('normalizes nombre on update', () => {
    const dto = plainToInstance(UpdateDeporteDto, { nombre: ' Fútbol ' });

    expect(dto.nombre).toBe('Fútbol');
  });
});
