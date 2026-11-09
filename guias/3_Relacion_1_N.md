# Relación uno a muchos entre `Torneo` y `Fase` en NestJS

## Objetivo y alcance

La meta es implementar y probar un CRUD de torneos y fases que demuestre la relación uno a muchos usando la llave foránea: primero se crea un torneo, se obtiene su `id` y se envía ese UUID como `torneo_id` al crear una fase. Las fases deben quedar asociadas al torneo y poder consultarse por esa relación.

- Un `Torneo` puede tener muchas fases.
- Cada `Fase` pertenece a un solo torneo.
- El CRUD de fases y su herencia STI (`FaseGrupos` y `FaseFinal`) ya existen; se modifican para relacionarlas con `Torneo`, no se vuelve a crear la entidad `Fase`.
- Se implementa `Torneo` de extremo a extremo: entidad, DTOs, mapper, service, controller, module, registro en `AppModule` y migración.
- El CRUD de Torneo permite crear primero un torneo y obtener su UUID para asociar fases. No crea ni actualiza fases embebidas.

La clave foránea de la relación uno a muchos es `torneo_id`, almacenada en la tabla `fases`. Por lo tanto, `Fase` es el lado dueño de la relación y lleva `@ManyToOne`; `Torneo` expone el lado inverso con `@OneToMany`.

El torneo también tiene el atributo `deporte_id`, que identifica su deporte. La entidad, el módulo y las reglas de negocio de `Deporte` corresponden a otra implementación y quedan fuera de esta guía. No se debe crear aquí una clase `Deporte` ni aceptar o guardar un objeto `Deporte` anidado. Para crear una restricción de base de datos desde `torneos.deporte_id`, primero se debe confirmar con quien implementa Deporte el nombre real de su tabla y clave primaria.

Los atributos de la API y las entidades se mantienen en `snake_case`, igual que en el CRUD de fases existente. Por ello, el atributo entregado como `maxEquipos` se representa como `max_equipos`.

## 1) Atributos de `Torneo`

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único del torneo. |
| `nombre` | String | Nombre del torneo. |
| `descripcion` | String | Descripción general del torneo. |
| `estado` | Enum | Estado: `PENDIENTE`, `EN_CURSO` o `FINALIZADO`. |
| `max_equipos` | Integer | Cantidad máxima de equipos participantes. Corresponde a `maxEquipos` en la definición inicial. |
| `deporte_id` | UUID | Identificador del deporte al que pertenece el torneo. |
| `fases` | Relación | Fases asociadas al torneo; no es una columna de `torneos`. |

## 2) Endpoints y estructura de archivos

Al finalizar, el servicio debe exponer el CRUD de Torneo y conservar el CRUD de Fase:

| Método | Ruta | Acción |
|---|---|---|
| `POST` | `/torneos` | Crear un torneo. |
| `GET` | `/torneos` | Listar torneos. |
| `GET` | `/torneos/:id` | Consultar un torneo por UUID. |
| `PATCH` | `/torneos/:id` | Actualizar sus atributos. |
| `DELETE` | `/torneos/:id` | Eliminarlo según la política de borrado definida para sus fases. |
| `GET` | `/torneos/:id/fases` | Listar las fases asociadas al torneo. |
| `POST` | `/fases` | Crear una fase asociada usando `torneo_id`. |
| `GET` | `/fases`, `/fases/:id` | Listar o consultar fases incluyendo `torneo_id`. |
| `PATCH` | `/fases/:id` | Actualizar una fase y, opcionalmente, asociarla a otro torneo existente. |
| `DELETE` | `/fases/:id` | Eliminar una fase. |

Se agregan los componentes de Torneo y se modifican los existentes de fases:

```text
src/
├── torneos/
│   ├── entities/
│   │   └── torneo.entity.ts
│   ├── dto/
│   │   ├── create-torneo.dto.ts
│   │   ├── update-torneo.dto.ts
│   │   └── torneo-response.dto.ts
│   ├── mappers/
│   │   └── torneo.mapper.ts
│   ├── torneos.controller.ts
│   ├── torneos.service.ts
│   └── torneos.module.ts
├── fases/
│   ├── entities/
│   │   └── fase.entity.ts
│   ├── dto/
│   │   ├── create-fase.dto.ts
│   │   ├── update-fase.dto.ts
│   │   └── fase-response.dto.ts
│   ├── mappers/
│   │   └── fase.mapper.ts
│   ├── fases.module.ts
│   └── fases.service.ts
├── migrations/
│   └── <timestamp>-CreateTorneosAndRelateFases.ts
└── app.module.ts
```

No basta con crear las dos entidades ni con declarar `@OneToMany` y `@ManyToOne`: sin controller, service, DTOs, mapper, module y rutas registradas, no se puede demostrar el flujo solicitado mediante la API. El CRUD de Torneo debe validar los datos, devolver el UUID al crear y no aceptar fases anidadas en sus solicitudes.

## 3) Crear la entidad `Torneo`

Archivo: `src/torneos/entities/torneo.entity.ts`

```typescript
import { Fase } from '../../fases/entities/fase.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EstadoTorneo {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADO = 'FINALIZADO',
}

@Entity('torneos')
export class Torneo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'enum', enum: EstadoTorneo, default: EstadoTorneo.PENDIENTE })
  estado!: EstadoTorneo;

  @Column({ type: 'int' })
  max_equipos!: number;

  @Column({ type: 'uuid' })
  deporte_id!: string;

  @OneToMany(() => Fase, (fase) => fase.torneo, { cascade: false })
  fases?: Fase[];
}
```

`fases` es una propiedad de navegación de TypeORM, no una columna ni un arreglo que se guarde dentro de `torneos`. `deporte_id` se representa aquí como UUID; esta guía no define una relación TypeORM con `Deporte` porque esa entidad pertenece a otra implementación.

## 4) Crear DTOs, mapper, service, controller y module de `Torneo`

### 4.1 DTOs

Crea `CreateTorneoDto` para validar los campos que llegan al crear:

- `nombre`: texto no vacío.
- `descripcion`: texto.
- `estado`: valor permitido del enum `EstadoTorneo`.
- `max_equipos`: entero positivo.
- `deporte_id`: UUID.

No incluyas `id` (lo genera la base de datos) ni `fases` en el DTO de creación. El usuario envía el identificador de un deporte existente. Si la FK de Deporte ya está configurada, un UUID inexistente debe rechazarse por la base de datos; la comprobación anticipada en el service solo se agrega cuando el módulo/entidad de Deporte esté disponible y coordinado con su responsable.

Crea `UpdateTorneoDto` usando `PartialType(CreateTorneoDto)` y `TorneoResponseDto` con los campos serializados en `snake_case`. El DTO de respuesta puede incluir `fases` solo en una ruta que solicite explícitamente esa relación; no devuelvas relaciones incompletas por defecto.

### 4.2 Mapper

Crea `TorneoMapper` con métodos para convertir `CreateTorneoDto` en entidad, aplicar campos definidos de `UpdateTorneoDto` y construir `TorneoResponseDto`. No intentes mapear o guardar fases desde el DTO de Torneo.

### 4.3 Service

Crea `TorneosService`, inyecta `Repository<Torneo>` y agrega operaciones `create`, `findAll`, `findOne`, `update` y `remove`. Las consultas por UUID deben responder `404 Not Found` si el torneo no existe. `findOne` y `update` no deben crear fases como efecto secundario.

Agrega una operación para listar fases de un torneo. Primero verifica que el torneo exista; luego consulta fases asociadas y las convierte con el mapper de fases. Si el torneo no existe, responde `404`, no una lista vacía.

### 4.4 Controller

Crea `TorneosController` bajo `@Controller('torneos')` y conecta las rutas del CRUD de la tabla anterior con `TorneosService`. Usa `ParseUUIDPipe` en rutas con `:id` y DTOs en `@Body()`. Define `GET ':id/fases'` de forma que no se confunda con la ruta de consulta por UUID.

### 4.5 Module y registro

Crea `TorneosModule` con los repositorios que utilizará el módulo, por ejemplo `TypeOrmModule.forFeature([Torneo, Fase, FaseGrupos, FaseFinal])`, `TorneosController` y `TorneosService`; registra `TorneoMapper` y, si las respuestas de Torneo incluyen fases convertidas, `FaseMapper` como providers. Así `TorneosService` puede cargar y mapear las fases de `GET /torneos/:id/fases` sin depender de un ciclo entre `TorneosModule` y `FasesModule`. Exporta providers solo si otro módulo los necesita. Importa ambos módulos en `AppModule`.

El módulo de fases necesita los repositorios de ambas entidades para resolver la FK. Registra `Torneo` en `TypeOrmModule.forFeature` de `FasesModule` (ver sección 7) y confirma que la configuración de TypeORM descubre `torneo.entity.ts`.

## 5) Modificar la entidad existente `Fase`

Archivo: `src/fases/entities/fase.entity.ts`

### 5.1 Reemplazar la columna escalar

Importa `Torneo` y los decoradores `ManyToOne`, `JoinColumn` y `RelationId`:

```typescript
import { Torneo } from '../../torneos/entities/torneo.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  TableInheritance,
} from 'typeorm';
```

En la clase abstracta `Fase`, reemplaza la declaración existente de `torneo_id`:

```typescript
@Column({ type: 'uuid' })
torneo_id!: string;
```

por la relación:

```typescript
@ManyToOne(() => Torneo, (torneo) => torneo.fases, {
  cascade: false,
  nullable: false,
  onDelete: 'CASCADE',
})
@JoinColumn({ name: 'torneo_id' })
torneo!: Torneo;

@RelationId((fase: Fase) => fase.torneo)
torneo_id!: string;
```

La relación se declara en la clase base abstracta `Fase`, de modo que aplica a `FaseGrupos` y `FaseFinal`. TypeORM mantiene la columna `torneo_id` en la tabla STI `fases`; no se crea una columna por subtipo ni una tabla adicional para la relación.

`@RelationId` expone el UUID de la relación para las respuestas existentes, pero no asigna ni cambia la relación en una operación de escritura. Para crear o reasignar una fase, el servicio debe buscar el `Torneo` y asignarlo a `fase.torneo`.

`cascade: false` evita guardar torneos implícitamente al guardar una fase. `onDelete: 'CASCADE'` significa que eliminar un torneo en la base de datos elimina sus fases; confirmar que ese comportamiento es aceptable para el dominio antes de aplicar la migración.

## 6) Mantener los contratos del CRUD de fases

La API de fases conserva `torneo_id` en sus DTOs y respuestas. El cliente envía el UUID; el servidor resuelve el torneo y asigna la relación.

### 6.1 DTOs

Mantén `torneo_id` en `CreateFaseDto` como campo UUID obligatorio:

```typescript
@IsUUID()
torneo_id!: string;
```

En `UpdateFaseDto`, `torneo_id` puede seguir siendo opcional. Si se envía en un `PATCH`, el servicio debe comprobar que el torneo exista antes de reasignar la fase. No permitas recibir un objeto `torneo` anidado ni campos que no estén declarados en el DTO.

`FaseResponseDto` puede conservar:

```typescript
torneo_id!: string;
```

No es necesario incluir el objeto completo del torneo en cada respuesta de fase. Si la API requiere esa representación, defínela explícitamente en un DTO de respuesta; no actives cascadas para serializar o guardar relaciones.

### 6.2 Mapper

Actualiza `FaseMapper.toEntity` para no intentar asignar `torneo_id` como si fuera una relación. Separa el UUID antes de asignar el resto de los atributos:

```typescript
toEntity(dto: CreateFaseInput): Fase {
  const { tipo, torneo_id: _torneo_id, ...atributos } = dto;

  switch (tipo) {
    case TipoFase.GRUPOS:
      return Object.assign(new FaseGrupos(), atributos);
    case TipoFase.FINAL:
      return Object.assign(new FaseFinal(), atributos);
    default:
      throw new Error('Unsupported Fase type');
  }
}
```

`FaseMapper.mergeEntity` no debe modificar `torneo_id`. La reasignación se realiza en el servicio asignando la entidad `Torneo` encontrada a `fase.torneo`.

Al mapear una respuesta, usa el torneo cargado o el identificador de relación:

```typescript
torneo_id: entity.torneo?.id ?? entity.torneo_id,
```

En las operaciones de consulta donde el mapper necesite el objeto relacionado, carga `torneo` con `relations`. Si se decide no cargarlo, asegúrate de que `torneo_id` esté disponible mediante `@RelationId`.

## 7) Actualizar el módulo y el servicio de fases

### 7.1 Registrar la entidad

En `FasesModule`, registra `Torneo` junto con las entidades de fase para que el servicio pueda inyectar su repositorio:

```typescript
TypeOrmModule.forFeature([Fase, FaseGrupos, FaseFinal, Torneo])
```

Importa `Torneo` desde `../torneos/entities/torneo.entity`. Registra `TorneosModule` en `AppModule` para exponer el CRUD de Torneo. El patrón de entidades configurado por el proyecto debe incluir `torneo.entity.ts`.

### 7.2 Resolver el torneo al crear una fase

Inyecta `Repository<Torneo>` en `FasesService`. Antes de guardar una fase nueva:

1. Busca el torneo usando el UUID recibido en `dto.torneo_id`.
2. Si no existe, responde `404 Not Found`.
3. Convierte el DTO al subtipo concreto con el mapper existente.
4. Asigna el resultado a `fase.torneo`.
5. Guarda la fase y devuelve su DTO de respuesta.

Ejemplo del fragmento de asignación:

```typescript
const torneo = await this.torneosRepository.findOneBy({
  id: dto.torneo_id,
});
if (!torneo) {
  throw new NotFoundException(`Torneo with id ${dto.torneo_id} not found`);
}

const fase = this.faseMapper.toEntity(dto);
fase.torneo = torneo;
const saved = await this.fasesRepository.save(fase);
```

### 7.3 Resolver la relación en consultas y actualizaciones

- En `findAll` y `findOne`, carga la relación cuando la respuesta o el mapper necesiten `fase.torneo`.
- En `update`, si `dto.torneo_id` está definido, busca el torneo destino; responde `404` si no existe y luego asigna `fase.torneo = torneo`.
- No asignes directamente `fase.torneo_id`: `@RelationId` es de solo lectura para este propósito.
- Conserva las validaciones del subtipo, las fechas y el resto de las reglas del CRUD existente.
- La eliminación de una fase sigue igual. La eliminación de un torneo no debe implementarse mediante un borrado embebido desde el DTO de fase.

## 8) Migración de base de datos

No uses `synchronize: true`. Genera una nueva migración; no edites una migración que ya se haya aplicado:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/CreateTorneosAndRelateFases -d ./typeorm.config.ts
```

La migración debe:

1. Crear `torneos` con `id`, `nombre`, `descripcion`, `estado`, `max_equipos` y `deporte_id`.
2. Añadir una llave foránea no única desde `fases.torneo_id` hacia `torneos.id`, con la política de borrado que se haya aprobado.
3. No agregar una llave `UNIQUE` a `fases.torneo_id`: varias fases pueden pertenecer al mismo torneo.
4. Incluir una llave foránea desde `torneos.deporte_id` solo cuando se haya confirmado la tabla y la columna primaria reales de Deporte y que dicha tabla exista antes de aplicar la migración. No inventes el nombre ni generes aquí la entidad de Deporte.

Si la tabla `fases` ya contiene datos, verifica antes que cada `torneo_id` tenga un torneo correspondiente. Si hay filas huérfanas, crea o corrige los torneos y sus referencias antes de agregar la llave foránea; de lo contrario, MySQL rechazará la migración.

Revisa el SQL generado: debe crear `torneos` antes de agregar la FK desde `fases`. Una vez verificada, ejecuta:

```bash
npm run migration:run
```

Si la FK de Deporte depende de otra migración, coordina y aplica las migraciones en el orden acordado con el responsable de esa entidad.

## 9) Respuestas y consulta de fases de un torneo

El CRUD existente de fases continúa usando las mismas rutas:

- `POST /fases`
- `GET /fases`
- `GET /fases/:id`
- `PATCH /fases/:id`
- `DELETE /fases/:id`

La respuesta de una fase puede seguir exponiendo `torneo_id` y los campos propios de `GRUPOS` o `FINAL`. Implementa `GET /torneos/:id/fases` como parte de `TorneosController`: esta ruta debe buscar primero el torneo y después consultar sus fases por la relación. No devuelvas un arreglo vacío si el torneo solicitado no existe: responde `404 Not Found`.

Si se agrega una respuesta de torneo que incluya `fases`, carga la relación explícitamente (`relations: { fases: true }`) y convierte cada entidad con el mapper de fases. Evita crear o actualizar fases embebidas al crear o actualizar un torneo; las fases se administran mediante su propio CRUD.

## 10) Pruebas en Postman: demostrar la relación con la FK

El objetivo de estas pruebas es verificar el flujo completo mediante la API: crear un torneo, capturar el `id` devuelto y usar exactamente ese UUID como `torneo_id` para crear fases. Usa `Content-Type: application/json`.

### 10.1 Crear un torneo

Envía el deporte existente asignado por el responsable del módulo Deporte. No uses un UUID inventado si la llave foránea de Deporte está activa.

`POST http://localhost:3000/torneos`

```json
{
  "nombre": "Torneo Apertura",
  "descripcion": "Temporada de apertura",
  "estado": "PENDIENTE",
  "max_equipos": 16,
  "deporte_id": "550e8400-e29b-41d4-a716-446655440010"
}
```

La respuesta `201 Created` debe contener un `id` UUID para el torneo recién creado. Copia ese valor; se usará como `torneo_id` en las solicitudes siguientes. Si el módulo Deporte aún no está integrado, se debe coordinar un UUID válido con quien lo implementa o usar temporalmente un deporte existente en la base de datos. No desactives una FK para hacer pasar la prueba.

### 10.2 Crear una fase de grupos asociada

Reemplaza `TORNEO_ID_DEVUELTO` por el `id` obtenido en el paso anterior:

`POST http://localhost:3000/fases`

```json
{
  "tipo": "GRUPOS",
  "numero_orden": 1,
  "fecha_inicio": "2026-03-01",
  "fecha_fin": "2026-03-15",
  "estado": "PENDIENTE",
  "torneo_id": "TORNEO_ID_DEVUELTO",
  "cantidad_grupos": 4,
  "equipos_por_grupo": 4
}
```

La respuesta debe incluir el mismo `torneo_id`. La fase debe guardarse en la tabla `fases` con esa FK, no como una fase embebida en el JSON de Torneo.

### 10.3 Crear también una fase final

Envía otro `POST /fases` con `tipo: "FINAL"`, los campos obligatorios de ese subtipo y el mismo `torneo_id`. Esto prueba que la relación heredada de la clase base también funciona para `FaseFinal`, además de `FaseGrupos`.

### 10.4 Consultar para comprobar la relación

1. `GET http://localhost:3000/torneos/TORNEO_ID_DEVUELTO` debe devolver el torneo creado.
2. `GET http://localhost:3000/torneos/TORNEO_ID_DEVUELTO/fases` debe devolver las fases de grupos y final asociadas a ese torneo.
3. `GET http://localhost:3000/fases` debe devolver esas fases con `torneo_id` igual al ID del torneo.
4. `GET http://localhost:3000/fases/FASE_ID` debe conservar el `torneo_id` correspondiente.

La prueba principal se considera exitosa solo cuando el torneo se crea primero, el ID real de su respuesta se usa en los POST de fases y las consultas posteriores muestran la asociación. Enviar UUID con formato válido pero que no identifica un torneo existente debe producir `404 Not Found`; la FK en MySQL actúa además como protección de integridad.

### 10.5 Probar actualización y eliminación

- `PATCH /fases/FASE_ID` con un `torneo_id` de otro torneo existente debe reasignar la fase; consulta ambas listas de fases para comprobar que desapareció del torneo anterior y aparece en el nuevo.
- Un `PATCH` con un `torneo_id` inexistente debe responder `404 Not Found`.
- `DELETE /fases/FASE_ID` debe eliminar únicamente esa fase.
- `DELETE /torneos/TORNEO_ID` debe respetar la política `ON DELETE` definida en la migración. Con `CASCADE`, las fases relacionadas también desaparecen; con `RESTRICT`, el torneo no se elimina mientras tenga fases. Prueba el comportamiento acordado, no ambos.
- Las validaciones y restricciones de campos de `GRUPOS` y `FINAL` deben seguir funcionando.

## 11) Resumen

1. Se implementa el CRUD de Torneo completo: entidad, DTOs, mapper, service, controller, module, registro y migración.
2. `Fase` es el lado dueño con `@ManyToOne` y `@JoinColumn({ name: 'torneo_id' })`; `Torneo` expone `fases` con `@OneToMany`.
3. El `POST /torneos` devuelve el UUID; ese UUID se envía en `torneo_id` al `POST /fases`.
4. El service de fases busca el torneo real y asigna la relación; la FK no se simula enviando un objeto anidado ni guardando fases en cascada.
5. Se comprueba la relación consultando las fases desde el torneo y verificando que cada respuesta contiene el `torneo_id` correcto.
6. La migración agrega la FK `fases.torneo_id` sin restricción `UNIQUE`; la política de borrado se acuerda y se prueba.
7. `deporte_id` se conserva en Torneo, pero la entidad, el CRUD y la FK de Deporte se coordinan con su responsable; no se implementa Deporte en esta guía.
