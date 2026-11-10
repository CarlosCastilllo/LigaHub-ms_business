# 6 - Filtro de fases por tipo (`GET /fases?tipo=`)

## Objetivo y alcance

Permitir que `GET /fases` devuelva solo las fases de un tipo:

```text
GET /fases              → todas las fases (comportamiento anterior, sin cambios)
GET /fases?tipo=FINAL   → solo las fases finales
GET /fases?tipo=GRUPOS  → solo las fases de grupos
```

Lo usa el apartado de **fases finales** del frontend para pedir únicamente las finales, en lugar de recibir todas y descartarlas en el navegador.

Cambia solo el módulo `fases` de `ms_business`. **No hay que tocar `ms_security`**: el `SecurityGuard` envía `request.path`, que no incluye la consulta, así que el permiso que se valida sigue siendo `GET /fases`.

## 1) Por qué no basta con `find({ where: { tipo } })`

`Fase` usa herencia de tabla única:

```ts
@Entity('fases')
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Fase { ... }
```

`tipo` es la **columna discriminadora**: TypeORM la usa para saber si una fila es `FaseGrupos` o `FaseFinal`, pero no es una propiedad de la clase. Por eso `find({ where: { tipo } })` no compila ni funciona. La alternativa es el **query builder**, que permite filtrar por cualquier columna de la tabla:

```ts
this.fasesRepository
  .createQueryBuilder('fase')
  .leftJoinAndSelect('fase.torneo', 'torneo')
  .where('fase.tipo = :tipo', { tipo })
  .getMany();
```

El resultado sigue llegando como instancias de `FaseGrupos` o `FaseFinal`, así que el mapper funciona igual que antes.

## 2) Estructura de archivos

```text
src/fases/
├── dto/
│   └── find-fases-query.dto.ts   # nuevo
├── fases.controller.ts           # modificar findAll
├── fases.service.ts              # modificar findAll
└── fases.service.spec.ts         # agregar pruebas
```

## 3) DTO de la consulta

`src/fases/dto/find-fases-query.dto.ts`

```ts
import { IsEnum, IsOptional } from 'class-validator';
import { TipoFase } from '../entities/fase.entity';

export class FindFasesQueryDto {
  @IsOptional()
  @IsEnum(TipoFase)
  tipo?: TipoFase;
}
```

- `@IsOptional()`: sin `tipo` se listan todas las fases.
- `@IsEnum(TipoFase)`: solo acepta `GRUPOS` o `FINAL`. Cualquier otro valor responde `400`.
- El `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) también rechaza parámetros de consulta desconocidos, por ejemplo `?foo=1`.

## 4) Controlador

En `src/fases/fases.controller.ts` se importa `Query` y el DTO, y `findAll` recibe la consulta:

```ts
import { /* ... */ Query } from '@nestjs/common';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';

@Get()
findAll(@Query() query: FindFasesQueryDto) {
  return this.fasesService.findAll(query.tipo);
}
```

## 5) Servicio

En `src/fases/fases.service.ts` se importa `TipoFase` y `findAll` recibe el tipo opcional:

```ts
import { Fase, TipoFase } from './entities/fase.entity';

async findAll(tipo?: TipoFase): Promise<FaseResponseDto[]> {
  if (!tipo) {
    const fases = await this.fasesRepository.find({
      relations: { torneo: true },
    });
    return this.faseMapper.toResponseDtoList(fases);
  }

  // `tipo` es la columna discriminadora de la herencia: no es una propiedad
  // de la entidad, por eso se filtra con el query builder.
  const fases = await this.fasesRepository
    .createQueryBuilder('fase')
    .leftJoinAndSelect('fase.torneo', 'torneo')
    .where('fase.tipo = :tipo', { tipo })
    .getMany();
  return this.faseMapper.toResponseDtoList(fases);
}
```

Sin `tipo` se usa el mismo `find` de antes, así que el comportamiento existente no cambia. El filtro se aplica en la base de datos, no en memoria.

## 6) Pruebas unitarias

En `src/fases/fases.service.spec.ts`:

```ts
it('lists every phase when no type filter is given', async () => {
  repository.find.mockResolvedValue([groupsPhase(), finalPhase()]);

  const result = await service.findAll();

  expect(result.map(({ tipo }) => tipo)).toEqual([
    TipoFase.GRUPOS,
    TipoFase.FINAL,
  ]);
});

it('filters phases by the discriminator column when a type is given', async () => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn<() => Promise<Fase[]>>().mockResolvedValue([finalPhase()]),
  };
  const createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
  Object.assign(repository, { createQueryBuilder });

  const result = await service.findAll(TipoFase.FINAL);

  expect(queryBuilder.where).toHaveBeenCalledWith('fase.tipo = :tipo', {
    tipo: TipoFase.FINAL,
  });
  expect(repository.find).not.toHaveBeenCalled();
  expect(result).toHaveLength(1);
  expect(result[0]?.tipo).toBe(TipoFase.FINAL);
});
```

```bash
npm test -- src/fases
```

## 7) Pruebas en Postman

Todas con `Authorization: Bearer <token>` de un usuario con el permiso `GET /fases` (el rol `ADMIN` ya lo tiene).

| Petición | Resultado esperado |
|---|---|
| `GET /fases` | `200` con todas las fases. |
| `GET /fases?tipo=FINAL` | `200` solo con fases de `"tipo": "FINAL"`. |
| `GET /fases?tipo=GRUPOS` | `200` solo con fases de `"tipo": "GRUPOS"`. |
| `GET /fases?tipo=OTRO` | `400`: `tipo` debe ser `GRUPOS` o `FINAL`. |
| `GET /fases?foo=1` | `400`: parámetro no permitido. |
| `GET /fases?tipo=FINAL` sin token | `401`. |

## 8) Resumen

1. `tipo` es la columna discriminadora de la herencia, no una propiedad: se filtra con el query builder.
2. Un DTO de consulta valida que `tipo` sea opcional y solo `GRUPOS` o `FINAL`.
3. Sin `tipo`, `GET /fases` funciona exactamente igual que antes.
4. `ms_security` no cambia: la consulta no forma parte del permiso, que sigue siendo `GET /fases`.
