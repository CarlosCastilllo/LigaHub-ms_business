import { BadRequestException } from '@nestjs/common';
import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { ModalidadFinal } from '../entities/fase-final.entity';
import { CreateFaseFinalDto } from '../dto/create-fase-final.dto';
import { CreateFaseGruposDto } from '../dto/create-fase-grupos.dto';
import { CreateFaseValidationPipe } from './create-fase-validation.pipe';

describe('CreateFaseValidationPipe', () => {
  const pipe = new CreateFaseValidationPipe();
  const commonFields = {
    numero_orden: 1,
    fecha_inicio: '2026-03-01',
    fecha_fin: '2026-03-15',
    estado: EstadoFase.PENDIENTE,
    torneo_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('creates a validated groups DTO', async () => {
    const result = await pipe.transform({
      ...commonFields,
      tipo: TipoFase.GRUPOS,
      cantidad_grupos: 4,
      equipos_por_grupo: 4,
    });

    expect(result).toBeInstanceOf(CreateFaseGruposDto);
  });

  it('creates a validated final DTO', async () => {
    const result = await pipe.transform({
      ...commonFields,
      tipo: TipoFase.FINAL,
      numero_partidos: 3,
      modalidad: ModalidadFinal.IDA_Y_VUELTA,
    });

    expect(result).toBeInstanceOf(CreateFaseFinalDto);
  });

  it('rejects attributes from the other subtype', async () => {
    await expect(
      pipe.transform({
        ...commonFields,
        tipo: TipoFase.GRUPOS,
        cantidad_grupos: 4,
        equipos_por_grupo: 4,
        numero_partidos: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid date range', async () => {
    await expect(
      pipe.transform({
        ...commonFields,
        tipo: TipoFase.FINAL,
        fecha_fin: '2026-02-28',
        numero_partidos: 3,
        modalidad: ModalidadFinal.PARTIDO_UNICO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a phase that starts and ends on the same day', async () => {
    await expect(
      pipe.transform({
        ...commonFields,
        tipo: TipoFase.FINAL,
        fecha_fin: commonFields.fecha_inicio,
        numero_partidos: 1,
        modalidad: ModalidadFinal.PARTIDO_UNICO,
      }),
    ).resolves.toBeInstanceOf(CreateFaseFinalDto);
  });
});
