# CRUD de Fases

`Fase` es abstracta y usa herencia de tabla única (STI): `FaseGrupos` y
`FaseFinal` se guardan en la tabla `fases`, cuyo discriminador `tipo` identifica
el subtipo concreto. Se usa un solo CRUD y un DTO de creación; no se requieren
pipes ni validators propios para este módulo.

## Endpoints

| Método | Ruta | Acción |
|---|---|---|
| `POST` | `/fases` | Crear una fase según `tipo`. |
| `GET` | `/fases` | Listar fases; acepta el filtro opcional `?tipo=GRUPOS` o `?tipo=FINAL`. |
| `GET` | `/fases/:id` | Consultar una fase. |
| `PATCH` | `/fases/:id` | Actualizar campos comunes o propios del subtipo; no cambia `tipo`. |
| `DELETE` | `/fases/:id` | Eliminar una fase. |

## Estructura

```text
src/fases/
├── dto/
│   ├── create-fase.dto.ts
│   ├── fase-response.dto.ts
│   ├── find-fases-query.dto.ts
│   └── update-fase.dto.ts
├── entities/
│   ├── fase.entity.ts
│   ├── fase-final.entity.ts
│   └── fase-grupos.entity.ts
├── mappers/
│   └── fase.mapper.ts
├── fases.controller.ts
├── fases.module.ts
├── fases.service.ts
└── fases.service.spec.ts
```

Los DTOs usan `class-validator` y se validan con el `ValidationPipe` global
configurado en `main.ts`. El `whitelist` elimina propiedades sin decoradores y
`forbidNonWhitelisted` las rechaza.

## Entidades y DTOs

`Fase` contiene los campos comunes y está decorada con `@TableInheritance`.
Las entidades hijas usan `@ChildEntity('GRUPOS')` y `@ChildEntity('FINAL')`.
Las columnas específicas de subtipo son nullable en la tabla, pues las filas
del otro subtipo no las usan.

`CreateFaseDto` contiene los campos comunes y los campos de ambos subtipos.
`ValidateIf` activa la validación correspondiente de acuerdo con `tipo`:

```typescript
@ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.GRUPOS)
@IsInt()
@Min(1)
cantidad_grupos?: number;

@ValidateIf((fase: CreateFaseDto) => fase.tipo === TipoFase.FINAL)
@IsInt()
@Min(1)
numero_partidos?: number;
```

El DTO también valida los formatos de fechas, enums, UUID y rangos numéricos.
El service comprueba las condiciones que dependen de varios campos: fechas
ordenadas y que los campos enviados correspondan únicamente al subtipo elegido.
La misma comprobación del rango de fechas se realiza al combinar un `PATCH`
parcial con los valores guardados.

`UpdateFaseDto` omite `tipo` y los atributos de subtipo del DTO base y los
vuelve a declarar como opcionales. Así, la validación de creación condicionada
por `tipo` no interfiere con un `PATCH`, que no recibe ese discriminador.

## Mapper, service y controller

`FaseMapper.toEntity` crea `FaseGrupos` o `FaseFinal` según `dto.tipo`.
`mergeEntity` aplica campos comunes y solo asigna campos propios de la instancia
que se está actualizando. `toResponseDto` devuelve el discriminador y los
campos del subtipo correspondiente.

`FasesService` mantiene las operaciones compartidas del CRUD, verifica la
existencia de recursos relacionados y rechaza atributos de subtipo incorrecto
con `400 Bad Request`. `FasesController` recibe directamente `CreateFaseDto`
con `@Body()`; no se registra un pipe de creación en el módulo.

## Ejemplos de creación

`POST /fases` para una fase de grupos:

```json
{
  "tipo": "GRUPOS",
  "numero_orden": 1,
  "fecha_inicio": "2026-03-01",
  "fecha_fin": "2026-03-15",
  "estado": "PENDIENTE",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000",
  "cantidad_grupos": 4,
  "equipos_por_grupo": 4
}
```

`POST /fases` para una fase final:

```json
{
  "tipo": "FINAL",
  "numero_orden": 2,
  "fecha_inicio": "2026-03-16",
  "fecha_fin": "2026-03-30",
  "estado": "PENDIENTE",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000",
  "numero_partidos": 3,
  "modalidad": "IDA_Y_VUELTA"
}
```

Si se envían atributos del subtipo opuesto, o `fecha_fin` es anterior a
`fecha_inicio`, la operación responde con `400 Bad Request`. El atributo `tipo`
no se puede cambiar mediante `PATCH`.

## Base de datos

STI guarda el discriminador y los campos de ambos subtipos en `fases`. El
esquema se administra mediante migraciones; no se debe habilitar
`synchronize: true` en producción. Las migraciones no se ejecutan como parte de
la implementación del CRUD.
