import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHabilidadDto } from './create-habilidad.dto';
import { UpdateHabilidadDto } from './update-habilidad.dto';

async function erroresDe<T extends object>(
  dtoClass: new () => T,
  payload: object,
): Promise<string[]> {
  const errores = await validate(plainToInstance(dtoClass, payload));
  return errores.map(({ property }) => property);
}

describe('Habilidad DTOs', () => {
  const valido = { nombre: 'Velocidad', descripcion: 'Desplazamiento rápido' };

  it('accepts a valid habilidad', async () => {
    await expect(erroresDe(CreateHabilidadDto, valido)).resolves.toEqual([]);
  });

  it('normalizes the spaces of nombre and descripcion', () => {
    const dto = plainToInstance(CreateHabilidadDto, {
      nombre: '  Tiro   libre ',
      descripcion: '  Lanzamiento  directo ',
    });

    expect(dto.nombre).toBe('Tiro libre');
    expect(dto.descripcion).toBe('Lanzamiento  directo');
  });

  it('requires nombre and descripcion', async () => {
    await expect(erroresDe(CreateHabilidadDto, {})).resolves.toEqual([
      'nombre',
      'descripcion',
    ]);
  });

  it('rejects values made only of spaces', async () => {
    await expect(
      erroresDe(CreateHabilidadDto, { nombre: '   ', descripcion: '   ' }),
    ).resolves.toEqual(['nombre', 'descripcion']);
  });

  it('rejects values that do not fit their columns', async () => {
    await expect(
      erroresDe(CreateHabilidadDto, {
        nombre: 'a'.repeat(151),
        descripcion: 'a'.repeat(16384),
      }),
    ).resolves.toEqual(['nombre', 'descripcion']);
  });

  it('allows partial updates', async () => {
    await expect(
      erroresDe(UpdateHabilidadDto, { descripcion: 'Nueva' }),
    ).resolves.toEqual([]);
    await expect(erroresDe(UpdateHabilidadDto, {})).resolves.toEqual([]);
  });

  it('rejects null or blank values on update', async () => {
    await expect(
      erroresDe(UpdateHabilidadDto, { nombre: null, descripcion: '  ' }),
    ).resolves.toEqual(['nombre', 'descripcion']);
  });
});
