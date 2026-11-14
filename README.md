# LigaHub — Microservicio de negocio (`ms_business`)

Microservicio de **torneos** de LigaHub. Administra los torneos, sus fases (de grupos y finales), las inscripciones de equipos y la asignación de escenarios deportivos. Todas sus rutas están protegidas por el microservicio de seguridad (`ms_security`).

Construido con **NestJS 12**, **TypeORM** y **MySQL**.

## Tabla de contenido

- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Modelo de datos](#modelo-de-datos)
- [Endpoints](#endpoints)
- [Seguridad](#seguridad)
- [Validaciones y errores](#validaciones-y-errores)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Guías](#guías)

## Arquitectura

```text
Frontend (Next.js, :3000)
   │  Authorization: Bearer <JWT de ms_security>
   │  (pasa por el proxy /api/business/* del frontend)
   ▼
ms_business (NestJS, :3030) ──► MySQL
   │  SecurityGuard: ¿este token puede usar esta ruta y este método?
   ▼
ms_security (Spring Boot, :8181)
   POST /api/internal/security/permissions-validation
```

- **ms_security** emite los tokens y es dueño de usuarios, roles y permisos.
- **ms_business** no valida el JWT por sí mismo: en cada petición le pregunta a `ms_security` si está permitida.
- `escenario_id` identifica una entidad de otro microservicio; se almacena como UUID sin llave foránea. `Deporte`, `Equipo`, `Jugador` y sus relaciones pertenecen a este microservicio.

## Requisitos

- Node.js **20.19+** o **22.12+** (los paquetes de NestJS 12 son solo ESM).
- npm.
- MySQL con una base de datos creada para este servicio.
- `ms_security` en ejecución, para poder autorizar las peticiones.

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno: copia la plantilla y complétala
cp .env.example .env

# 3. Crear las tablas (synchronize está desactivado, el esquema se maneja con migraciones)
npm run migration:run

# 4. Arrancar
npm run start:dev      # desarrollo, con recarga
npm run start          # sin recarga
npm run build && npm run start:prod   # producción
```

Para deshacer la última migración aplicada: `npm run migration:revert`.

Migraciones incluidas (`src/migrations/`):

| Migración | Qué crea |
|---|---|
| `CreateFases` | Tabla `fases` con herencia de tabla única (columna `tipo`). |
| `CreateTorneosAndRelateFases` | Tabla `torneos` y la FK `fases.torneo_id`. |
| `CreateInscripcionesRelation` | Tabla `inscripciones` y su FK a `torneos`. |
| `CreateEscenariosTorneoRelation` | Tabla `escenarios_torneo` y su FK a `torneos`. |
| `CreateEscenariosPartidosAficionados` | Tablas de escenarios, partidos, aficionados, anotaciones, pelotas, boletas, apuestas y métodos de pago, con sus FKs. |
| `CreateJugadoresAndPosicionesEspaciales` | Tabla `jugadores`, responsable de anotaciones y tabla `posiciones_espaciales` con FKs a jugadores y pelotas. |
| `CreateEquiposAndEquipoJugador` | Tablas `equipos`, `equipo_jugador` y `aficionados_equipos`, más sus relaciones con fases, aficionados, inscripciones, partidos y jugadores. |
| `CreateHabilidadesAndHabilidadJugador` | Tabla `habilidades` y asociación N:N `habilidad-jugador` entre habilidades y jugadores. |
| `CreateDeportesAndEquiposDeportes` | Tabla `deportes`, jerarquía recursiva, FK desde torneos y asociación N:N `equipos-deportes`. |

La migración `CreateJugadoresAndPosicionesEspaciales` requiere que no existan anotaciones previas: cada anotación debe tener un jugador responsable y no es posible inferirlo automáticamente. Si ya hay datos, asígnales jugadores antes de aplicar esta migración.
La migración `CreateEquiposAndEquipoJugador` requiere que no haya inscripciones ni partidos existentes, porque sus `equipo_id` actuales no se pueden vincular de forma segura a equipos que aún no existen.
La migración `CreateDeportesAndEquiposDeportes` detiene su ejecución si hay torneos cuyo `deporte_id` no corresponda a un deporte existente. Antes de ejecutarla, crea o reconcilia esos deportes para que la nueva FK pueda aplicarse.

## Variables de entorno

Se leen del archivo `.env` (no versionado). La plantilla es [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No | Puerto HTTP. Por defecto `3030`. |
| `DB_HOST` | Sí | Host de MySQL. |
| `DB_PORT` | Sí | Puerto de MySQL (normalmente `3306`). |
| `DB_USER` | Sí | Usuario de MySQL. |
| `DB_PASS` | Sí | Contraseña de MySQL. |
| `DB_NAME` | Sí | Nombre de la base de datos. |
| `MS_SECURITY` | Sí | URL base de `ms_security`, por ejemplo `http://localhost:8181`. Sin ella todas las rutas responden `503`. |

## Modelo de datos

```text
Torneo 1 ──── N Fase              (abstracta; subtipos FaseGrupos y FaseFinal)
Torneo 1 ──── N Inscripcion       (inscripción a un Equipo)
Torneo 1 ──── N EscenarioTorneo   (escenario_id → microservicio de escenarios)
Equipo 1 ──── N Inscripcion
Equipo N ──── 1 FaseGrupos (subtipo de Fase)
Equipo N ──── N Partido (mediante local/visitante)
Equipo N ──── N Torneo (mediante Inscripcion)
Equipo 1 ──── N EquipoJugador N ──── 1 Jugador
Equipo N ──── N Aficionado (mediante AficionadoEquipo)
Equipo N ──── N Deporte (mediante EquipoDeporte)
Deporte 1 ──── N Torneo
Deporte 1 ──── N Deporte (jerarquía opcional padre-hijos)
Jugador 1 ──── N Anotacion
Jugador 1 ──── N PosicionEspacial ──── N 1 Pelota
Habilidad 1 ──── N HabilidadJugador N ──── 1 Jugador
```

Al eliminar un torneo se eliminan en cascada sus fases, inscripciones y asignaciones de escenario. Todos los `id` son UUID generados por la base de datos y las fechas se envían como `YYYY-MM-DD`.

Cada `PosicionEspacial` registra `x`, `y` y `tiempo_segundos`, y pertenece exactamente a un jugador o a una pelota. Cada anotación requiere el jugador responsable. Los jugadores con anotaciones o posiciones no se pueden eliminar hasta borrar o reasignar esos registros.
`EquipoJugador` es la entidad intermedia del historial jugador-equipo: cada registro contiene las fechas de inicio y fin (esta última puede ser nula si la relación sigue activa). Los equipos con historial, inscripciones o partidos no se pueden eliminar.
`FaseGrupos` es el subtipo existente de `Fase` y puede estar relacionado con varios equipos; cada equipo puede tener una fase de grupos opcional asignada mediante `fase_grupos_id`. Si se elimina esa fase, la asignación del equipo se limpia. `Partido` funciona como entidad intermedia de los enfrentamientos entre equipos, guardando los roles de local y visitante. La inscripción es la asociación equipo-torneo y conserva su fecha y estado.
`EquipoDeporte` es la asociación N:N sin campos extra entre equipos y deportes; cada pareja es única. Un deporte puede tener cero o un deporte padre y varios hijos, y es el deporte referenciado por los torneos. Los deportes relacionados con torneos, equipos o hijos no se pueden eliminar hasta quitar esas relaciones.

### Equipo (`equipos`)

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto | Obligatorio, máx. 150. |

### Historial de equipos por jugador (`equipo_jugador`)

| Campo | Tipo | Reglas |
|---|---|---|
| `equipo_id` | UUID | Equipo existente. |
| `jugador_id` | UUID | Jugador existente. |
| `fecha_inicio` | fecha | Obligatoria, `YYYY-MM-DD`. |
| `fecha_fin` | fecha | Opcional; si se informa debe ser igual o posterior a `fecha_inicio`. |

### Preferencias de equipos (`aficionados_equipos`)

Asociación N:N sin campos adicionales entre un aficionado y sus equipos preferidos. La pareja `aficionado_id` + `equipo_id` es única.

### Jugador (`jugadores`)

| Campo | Tipo | Reglas |
|---|---|---|
| `nombres` | texto | Obligatorio, máx. 100. |
| `apellidos` | texto | Obligatorio, máx. 100. |
| `fecha_nacimiento` | fecha | Obligatoria, formato `YYYY-MM-DD`. |
| `nacionalidad` | texto | Obligatoria, máx. 100. |

### Habilidad (`habilidades`)

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto | Obligatorio, máx. 150. |
| `descripcion` | texto | Obligatoria. |

`HabilidadJugador` es la asociación N:N sin campos extra; cada pareja
`habilidad_id` + `jugador_id` es única. La tabla intermedia se llama
`habilidad-jugador` (con guion). No se puede eliminar una habilidad o un jugador
mientras tenga asociaciones; primero deben eliminarse las filas intermedias.

### Posición espacial (`posiciones_espaciales`)

| Campo | Tipo | Reglas |
|---|---|---|
| `x`, `y` | número | Coordenadas de la posición. |
| `tiempo_segundos` | entero | Segundo transcurrido del partido, ≥ 0. |
| `jugador_id` | UUID | Jugador posicionado; exactamente uno de `jugador_id` y `pelota_id` debe informarse. |
| `pelota_id` | UUID | Pelota posicionada; exactamente uno de `jugador_id` y `pelota_id` debe informarse. |

### Torneo (`torneos`)

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto | Obligatorio, máx. 255. |
| `descripcion` | texto | Obligatorio. |
| `estado` | enum | `PENDIENTE` · `EN_CURSO` · `FINALIZADO`. |
| `max_equipos` | entero | ≥ 1. |
| `deporte_id` | UUID | Deporte existente (FK a `deportes`). |

### Deporte (`deportes`)

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto | Obligatorio, máx. 150. |
| `descripcion` | texto | Obligatoria. |
| `deporte_padre_id` | UUID | Opcional; identifica el deporte padre y no puede crear ciclos. |

### Fase (`fases`)

`Fase` es una clase **abstracta** con herencia de tabla única: todos los subtipos se guardan en la tabla `fases` y la columna `tipo` indica cuál es.

| Campo común | Tipo | Reglas |
|---|---|---|
| `tipo` | enum | `GRUPOS` o `FINAL`. Solo se envía al crear; no se puede cambiar. |
| `numero_orden` | entero | ≥ 1. |
| `fecha_inicio` | fecha | `YYYY-MM-DD`. |
| `fecha_fin` | fecha | `YYYY-MM-DD`, igual o posterior a `fecha_inicio`. |
| `estado` | enum | `PENDIENTE` · `EN_CURSO` · `FINALIZADA`. |
| `torneo_id` | UUID | Torneo existente. |

| Subtipo | Campos propios |
|---|---|
| `GRUPOS` (`FaseGrupos`) | `cantidad_grupos` (≥ 1), `equipos_por_grupo` (≥ 2) |
| `FINAL` (`FaseFinal`) | `numero_partidos` (≥ 1), `modalidad` (`PARTIDO_UNICO` · `IDA_Y_VUELTA`) |

### Inscripción (`inscripciones`)

| Campo | Tipo | Reglas |
|---|---|---|
| `fecha_inscripcion` | fecha | `YYYY-MM-DD`. |
| `estado` | enum | `PENDIENTE` · `ACEPTADA` · `RECHAZADA`. |
| `equipo_id` | UUID | Equipo inscrito (FK a `equipos`). |
| `torneo_id` | UUID | Torneo existente. |

### Escenario de torneo (`escenarios_torneo`)

| Campo | Tipo | Reglas |
|---|---|---|
| `fecha_asignacion` | fecha | `YYYY-MM-DD`. |
| `estado` | enum | `ACTIVO` · `INACTIVO`. |
| `escenario_id` | UUID | Escenario deportivo (otro microservicio). |
| `torneo_id` | UUID | Torneo existente. |

## Endpoints

Todas las rutas exigen el header `Authorization: Bearer <token>` (ver [Seguridad](#seguridad)). En `PATCH` todos los campos son opcionales. `DELETE` responde `{ "message": "... deleted successfully" }`.

### Torneos

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/torneos` | Crea un torneo. |
| `GET` | `/torneos` | Lista los torneos. |
| `GET` | `/torneos/:id` | Obtiene un torneo. |
| `GET` | `/torneos/:id/fases` | Lista las fases del torneo. |
| `PATCH` | `/torneos/:id` | Actualiza un torneo. |
| `DELETE` | `/torneos/:id` | Elimina el torneo y, en cascada, sus fases, inscripciones y escenarios. |

`deporte_id` debe identificar un deporte creado previamente en `/deportes`.

```json
POST /torneos
{
  "nombre": "Copa Apertura",
  "descripcion": "Torneo interfacultades",
  "estado": "PENDIENTE",
  "max_equipos": 16,
  "deporte_id": "550e8400-e29b-41d4-a716-446655440020"
}
```

### Fases

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/fases` | Crea una fase de grupos o final según `tipo`. |
| `GET` | `/fases` | Lista todas las fases. |
| `GET` | `/fases?tipo=FINAL` | Lista solo las fases finales. |
| `GET` | `/fases?tipo=GRUPOS` | Lista solo las fases de grupos. |
| `GET` | `/fases/:id` | Obtiene una fase. |
| `PATCH` | `/fases/:id` | Actualiza una fase. No se puede cambiar `tipo` ni enviar campos del otro subtipo. |
| `DELETE` | `/fases/:id` | Elimina una fase. |

`tipo` en la consulta es opcional; cualquier valor distinto de `GRUPOS` o `FINAL` responde `400`.

```json
POST /fases   (fase final)
{
  "tipo": "FINAL",
  "numero_orden": 2,
  "fecha_inicio": "2026-11-20",
  "fecha_fin": "2026-11-30",
  "estado": "PENDIENTE",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000",
  "numero_partidos": 2,
  "modalidad": "IDA_Y_VUELTA"
}
```

```json
POST /fases   (fase de grupos)
{
  "tipo": "GRUPOS",
  "numero_orden": 1,
  "fecha_inicio": "2026-11-01",
  "fecha_fin": "2026-11-15",
  "estado": "PENDIENTE",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000",
  "cantidad_grupos": 4,
  "equipos_por_grupo": 4
}
```

La respuesta incluye `tipo` y solo los campos del subtipo correspondiente.

### Jugadores y posiciones espaciales

Ambos recursos ofrecen `POST`, `GET` (colección y `/:id`), `PATCH /:id` y `DELETE /:id` en `/jugadores` y `/posiciones-espaciales`. Al crear una posición, se debe enviar solo una de estas referencias:

```json
{
  "x": 23.5,
  "y": 17,
  "tiempo_segundos": 42,
  "jugador_id": "550e8400-e29b-41d4-a716-446655440210"
}
```

Para registrar la posición del balón, se usa `pelota_id` en lugar de `jugador_id`. Las anotaciones (`/anotaciones`) ahora también requieren `jugador_id` además de `partido_id`.

### Equipos e historial de jugadores

`/equipos` y `/equipo-jugador` ofrecen `POST`, `GET` (colección y `/:id`), `PATCH /:id` y `DELETE /:id`. Para registrar una vinculación de jugador a equipo:

```json
{
  "equipo_id": "550e8400-e29b-41d4-a716-446655440220",
  "jugador_id": "550e8400-e29b-41d4-a716-446655440210",
  "fecha_inicio": "2026-01-15",
  "fecha_fin": null
}
```

### Habilidades de jugadores

`/habilidades` y `/habilidad-jugador` ofrecen `POST`, `GET` (colección y
`/:id`), `PATCH /:id` y `DELETE /:id`. Una habilidad requiere `nombre` y
`descripcion`; para asignarla a un jugador se crea una fila intermedia:

```json
{
  "habilidad_id": "550e8400-e29b-41d4-a716-446655440310",
  "jugador_id": "550e8400-e29b-41d4-a716-446655440210"
}
```

La pareja habilidad-jugador no se puede repetir. Las entidades enlazadas no se
pueden eliminar hasta borrar sus asociaciones.

### Deportes y equipos

| Método | Ruta | Descripción |
|---|---|---|
| `POST`, `GET` | `/deportes` | Crear y listar deportes. |
| `GET`, `PATCH`, `DELETE` | `/deportes/:id` | Consultar, actualizar o eliminar un deporte. |
| `POST`, `GET` | `/equipos-deportes` | Crear y listar asociaciones equipo-deporte. |
| `GET`, `PATCH`, `DELETE` | `/equipos-deportes/:id` | Consultar, actualizar o eliminar una asociación. |

Cada deporte requiere `nombre` y `descripcion`; `deporte_padre_id` es opcional
para construir una jerarquía. `/equipos-deportes` recibe `equipo_id` y
`deporte_id`. No se permite repetir una pareja ni eliminar deportes o equipos
que todavía tengan asociaciones.

```json
POST /deportes
{
  "nombre": "Fútbol",
  "descripcion": "Deporte de equipo",
  "deporte_padre_id": null
}
```

```json
POST /equipos-deportes
{
  "equipo_id": "550e8400-e29b-41d4-a716-446655440220",
  "deporte_id": "550e8400-e29b-41d4-a716-446655440420"
}
```

### Equipos preferidos

`/aficionados-equipos` ofrece `POST`, `GET` (colección y `/:id`), `PATCH /:id` y `DELETE /:id`. Para crear una preferencia se envían `aficionado_id` y `equipo_id`. Un equipo se puede asociar o desasociar de una `FaseGrupos` existente mediante `fase_grupos_id` en `POST /equipos` o `PATCH /equipos/:id`.

### Inscripciones

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/inscripciones` | Inscribe un equipo en un torneo. |
| `GET` | `/inscripciones` | Lista las inscripciones. |
| `GET` | `/inscripciones/:id` | Obtiene una inscripción. |
| `GET` | `/inscripciones/reports/torneo/:torneoId/count` | Cuenta las inscripciones de un torneo: `{ "torneo_id", "total_inscripciones" }`. |
| `PATCH` | `/inscripciones/:id` | Actualiza una inscripción. |
| `DELETE` | `/inscripciones/:id` | Elimina una inscripción. |

```json
POST /inscripciones
{
  "fecha_inscripcion": "2026-11-09",
  "estado": "PENDIENTE",
  "equipo_id": "550e8400-e29b-41d4-a716-446655440010",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Escenarios de torneo

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/escenarios-torneo` | Asigna un escenario a un torneo. |
| `GET` | `/escenarios-torneo` | Lista las asignaciones. |
| `GET` | `/escenarios-torneo/:id` | Obtiene una asignación. |
| `GET` | `/escenarios-torneo/reports/torneo/:torneoId/count` | Cuenta los escenarios de un torneo: `{ "torneo_id", "total_escenarios" }`. |
| `PATCH` | `/escenarios-torneo/:id` | Actualiza una asignación. |
| `DELETE` | `/escenarios-torneo/:id` | Elimina una asignación. |

```json
POST /escenarios-torneo
{
  "fecha_asignacion": "2026-11-09",
  "estado": "ACTIVO",
  "escenario_id": "550e8400-e29b-41d4-a716-446655440030",
  "torneo_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Seguridad

`SecurityGuard` ([src/common/guards/security.guard.ts](src/common/guards/security.guard.ts)) está registrado como guard **global**, así que protege todas las rutas, incluidas las que se agreguen en el futuro.

En cada petición:

1. Exige el header `Authorization: Bearer <token>`.
2. Llama a `POST {MS_SECURITY}/api/internal/security/permissions-validation` con el mismo token y el cuerpo `{ "url": <ruta>, "method": <método> }`.
3. Solo deja pasar la petición si `ms_security` responde `{ "allowed": true }`.

| Situación | Respuesta |
|---|---|
| Falta el header o no tiene formato `Bearer <token>` | `401` |
| Token inválido, expirado o sesión cerrada | `401` |
| El usuario no tiene el permiso | `403` |
| `MS_SECURITY` no configurada, o `ms_security` caído o lento (más de 5 s) | `503` |

**Cómo se dan los permisos.** Los permisos se registran en `ms_security` como pares método + URL, con `{id}` en lugar de los identificadores (por ejemplo `PATCH /fases/{id}`). El seeder de `ms_security` ya se los asigna todos al rol `ADMIN`. Para otro rol, asígnalos desde la matriz de permisos del frontend.

La consulta (`?tipo=...`) **no forma parte del permiso**: quien tenga `GET /fases` puede listar fases de cualquier tipo.

## Validaciones y errores

- Un `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`: los campos que no están en el DTO se rechazan con `400`.
- Los `:id` deben ser UUID válidos (`ParseUUIDPipe`); si no lo son, `400`.
- El DTO único de creación valida condicionalmente los campos propios de `GRUPOS` o `FINAL`; el service comprueba que no se mezclen atributos de ambos subtipos y valida el rango de fechas también en creación y actualización.
- `fecha_fin` no puede ser anterior a `fecha_inicio`, tanto al crear como en un `PATCH` parcial.
- Si un `torneo_id` o un `:id` no existe, `404`.

## Pruebas

```bash
npm test            # pruebas unitarias (servicios, controladores y pipes)
npm run test:cov    # con cobertura
npm run test:e2e    # pruebas end-to-end (test/)
npm run lint        # oxlint
```

Las pruebas unitarias usan repositorios simulados: no necesitan MySQL ni `ms_security`.

## Estructura del proyecto

```text
src/
├─ common/guards/        SecurityGuard (autorización contra ms_security)
├─ torneos/              CRUD de torneos
├─ fases/                CRUD de fases (herencia GRUPOS / FINAL), pipe y validador de fechas
├─ inscripciones/        CRUD de inscripciones y reporte por torneo
├─ escenarios-torneo/    CRUD de asignaciones de escenarios y reporte por torneo
├─ migrations/           Migraciones de TypeORM
├─ app.module.ts         Conexión a MySQL y registro del guard global
└─ main.ts               Arranque y ValidationPipe global
```

Cada módulo sigue la misma estructura: `entities/`, `dto/`, `mappers/`, `repositories/` (cuando hay reportes), `*.service.ts`, `*.controller.ts`, `*.module.ts` y sus pruebas `*.spec.ts`.

## Guías

La carpeta [`guias/`](guias/) explica paso a paso cómo se construyó cada parte:

| Guía | Tema |
|---|---|
| `0_1_Estructura_del_proyecto.md` | Conceptos base de NestJS. |
| `1_PrimerCrud.md` | CRUD de fases con clase abstracta. |
| `3_Relacion_1_N*.md`, `4_...EscenarioTorneo.md` | Relaciones 1:N de torneos con fases, inscripciones y escenarios. |
| `5_guardian (1).md` | Guard de seguridad contra `ms_security`. |
| `6_Filtro_fases_por_tipo.md` | Filtro `GET /fases?tipo=`. |
| `7_Frontend_escenarios_y_fase_final.md` | Apartados del frontend para escenarios de torneo y fase final. |
