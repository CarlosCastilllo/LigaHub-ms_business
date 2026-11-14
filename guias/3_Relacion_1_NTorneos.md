# Relación uno a muchos entre `Torneo` e `Inscripcion` en NestJS

## Objetivo y alcance

Implementar el CRUD de inscripciones relacionadas con torneos y poder comprobar en la API que:

- Un `Torneo` puede tener muchas inscripciones.
- Cada `Inscripcion` pertenece a un solo torneo.
- La llave foránea `torneo_id` se almacena en la tabla `inscripciones`.
- Para crear una inscripción se envía el UUID de un torneo existente; no se crean inscripciones embebidas en el cuerpo de Torneo.

La entidad y el CRUD de `Torneo` se implementan en la guía [3_Relacion_1_N.md](./3_Relacion_1_N.md). Esta guía los reutiliza: solo se agrega la relación inversa `inscripciones` a la entidad existente y se crea el módulo de `Inscripcion` con sus DTOs, mapper, repositorio, service, controller, pruebas y migración.

La entidad `Inscripcion` usa los atributos definidos para el dominio: `id`, `fecha_inscripcion`, `estado`, `equipo_id` y `torneo_id`. Se conserva `fecha_inscripcion` en `snake_case` como representación de `fechaInscripcion`; `equipo_id` se almacena como UUID. Esta guía no crea la entidad Equipo ni define una FK hacia su tabla, porque esa implementación y el nombre real de su tabla pertenecen a otro alcance.

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único de la inscripción; lo genera la base de datos. |
| `fecha_inscripcion` | Date | Fecha de realización de la inscripción. En JSON se envía como `YYYY-MM-DD`. |
| `estado` | Enum | Estado: `PENDIENTE`, `ACEPTADA` o `RECHAZADA`. |
| `equipo_id` | UUID | Identificador del equipo que se inscribe. |
| `torneo_id` | UUID | Identificador del torneo al que pertenece la inscripción; FK hacia `torneos.id`. |

## 1) Lado dueño de la relación

El lado dueño es `Inscripcion`, porque la FK reside en su tabla:

- `inscripciones.torneo_id` → `torneos.id`

Por eso, `@ManyToOne()` y `@JoinColumn()` se declaran en `Inscripcion`. `Torneo` expone el lado inverso mediante `@OneToMany()`. La columna `torneo_id` no debe tener restricción `UNIQUE`: un torneo puede tener muchas inscripciones.

## 2) Estructura de archivos

```text
src/
├── torneos/
│   └── entities/
│       └── torneo.entity.ts             # agregar relación inversa
├── inscripciones/
│   ├── dto/
│   │   ├── create-inscripcion.dto.ts
│   │   ├── update-inscripcion.dto.ts
│   │   ├── inscripcion-response.dto.ts
│   │   └── torneo-inscripciones-report.dto.ts
│   ├── entities/
│   │   └── inscripcion.entity.ts
│   ├── mappers/
│   │   └── inscripcion.mapper.ts
│   ├── repositories/
│   │   └── inscripciones.repository.ts
│   ├── inscripciones.controller.ts
│   ├── inscripciones.service.ts
│   └── inscripciones.module.ts
├── migrations/
│   └── <timestamp>-CreateInscripcionesRelation.ts
└── app.module.ts
```

Genera un recurso REST si resulta útil:

```bash
nest g resource inscripciones --no-spec
```

Selecciona **REST API** y organiza el recurso según la estructura anterior. No generes otra entidad ni otro CRUD de Torneo si ya se implementaron siguiendo la guía relacionada.

## 3) Entidades

### 3.1 Agregar la relación inversa a `Torneo`

Archivo: `src/torneos/entities/torneo.entity.ts`

Importa `Inscripcion` y `OneToMany`; conserva todos los atributos y relaciones existentes de Torneo:

```typescript
import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';
import { OneToMany } from 'typeorm';
```

Dentro de `Torneo`, agrega:

```typescript
@OneToMany(
  () => Inscripcion,
  (inscripcion) => inscripcion.torneo,
  { cascade: false },
)
inscripciones?: Inscripcion[];
```

La propiedad `inscripciones` es una relación de navegación de TypeORM, no una columna en `torneos`. `cascade: false` evita crear o guardar inscripciones al guardar un torneo.

### 3.2 Crear `Inscripcion` (lado dueño)

Archivo: `src/inscripciones/entities/inscripcion.entity.ts`

```typescript
import { Torneo } from '../../torneos/entities/torneo.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

export enum EstadoInscripcion {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
}

@Entity('inscripciones')
export class Inscripcion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  fecha_inscripcion!: string;

  @Column({
    type: 'enum',
    enum: EstadoInscripcion,
    default: EstadoInscripcion.PENDIENTE,
  })
  estado!: EstadoInscripcion;

  @Column({ type: 'uuid' })
  equipo_id!: string;

  @ManyToOne(() => Torneo, (torneo) => torneo.inscripciones, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Torneo;

  @RelationId((inscripcion: Inscripcion) => inscripcion.torneo)
  torneo_id!: string;
}
```

`@RelationId` permite exponer el UUID en las respuestas, pero no asigna la relación al guardar. Para crear o reasignar una inscripción, el service debe buscar el torneo y establecer `inscripcion.torneo`.

`nullable: false` exige que toda inscripción pertenezca a un torneo. `onDelete: 'CASCADE'` hace que MySQL elimine las inscripciones de un torneo al borrar ese torneo. Confirma que esa política sea la deseada antes de aplicar la migración.

## 4) Migración

La tabla `torneos` y su migración deben existir y estar aplicadas primero. No uses `synchronize: true` ni edites una migración ya aplicada. Genera una nueva migración:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/CreateInscripcionesRelation -d ./typeorm.config.ts
```

Revisa que la migración:

- Cree `inscripciones` con `id`, `fecha_inscripcion`, `estado`, `equipo_id` y `torneo_id`.
- Incluya `equipo_id` como UUID del equipo inscrito; no agregue una FK a Equipo hasta confirmar su tabla y clave primaria con el responsable de esa implementación.
- Agregue una FK desde `inscripciones.torneo_id` hacia `torneos.id`.
- Defina la política de borrado `ON DELETE CASCADE`, si fue aprobada.
- No cree un índice `UNIQUE` en `torneo_id`.
- Use tipos compatibles con MySQL; un UUID debe tener la misma representación que `torneos.id` (en este proyecto, `varchar(36)`).

Si la tabla `inscripciones` ya contiene datos, primero garantiza que cada `torneo_id` corresponda a un Torneo existente. De lo contrario, MySQL rechazará la FK.

Aplica la migración después de revisar el SQL:

```bash
npm run migration:run
```

## 5) DTOs

Los ejemplos usan nombres `snake_case` para mantener consistencia con las entidades y los contratos actuales.

### 5.1 DTO de creación

Archivo: `src/inscripciones/dto/create-inscripcion.dto.ts`

```typescript
import { IsDateString, IsEnum, IsUUID, Matches } from 'class-validator';
import { EstadoInscripcion } from '../entities/inscripcion.entity';

export class CreateInscripcionDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inscripcion!: string;

  @IsEnum(EstadoInscripcion)
  estado!: EstadoInscripcion;

  @IsUUID()
  equipo_id!: string;

  @IsUUID()
  torneo_id!: string;
}
```

`id` lo genera la base de datos. El cliente envía `torneo_id`, no un objeto `torneo` anidado.

### 5.2 DTO de actualización

Archivo: `src/inscripciones/dto/update-inscripcion.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateInscripcionDto } from './create-inscripcion.dto';

export class UpdateInscripcionDto extends PartialType(CreateInscripcionDto) {}
```

En `PATCH`, todos los campos son opcionales. Si llega `torneo_id`, el service busca el torneo destino y lo asigna solo si existe.

### 5.3 DTO de respuesta

Archivo: `src/inscripciones/dto/inscripcion-response.dto.ts`

```typescript
import { EstadoInscripcion } from '../entities/inscripcion.entity';

export class InscripcionResponseDto {
  id!: string;
  fecha_inscripcion!: string;
  estado!: EstadoInscripcion;
  equipo_id!: string;
  torneo_id!: string;
}
```

### 5.4 DTO del reporte de inscripciones

Archivo: `src/inscripciones/dto/torneo-inscripciones-report.dto.ts`

```typescript
export class TorneoInscripcionesReportDto {
  torneo_id!: string;
  total_inscripciones!: number;
}
```

El reporte permite comprobar cuántas inscripciones quedaron asociadas a un torneo.

## 6) Mapper de `Inscripcion`

Archivo: `src/inscripciones/mappers/inscripcion.mapper.ts`

```typescript
import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { InscripcionResponseDto } from '../dto/inscripcion-response.dto';
import { UpdateInscripcionDto } from '../dto/update-inscripcion.dto';
import { Inscripcion } from '../entities/inscripcion.entity';

export class InscripcionMapper {
  static toEntity(
    dto: CreateInscripcionDto,
    torneo: Inscripcion['torneo'],
  ): Inscripcion {
    return Object.assign(new Inscripcion(), {
      fecha_inscripcion: dto.fecha_inscripcion,
      estado: dto.estado,
      equipo_id: dto.equipo_id,
      torneo,
    });
  }

  static mergeEntity(
    entity: Inscripcion,
    dto: UpdateInscripcionDto,
  ): Inscripcion {
    if (dto.fecha_inscripcion !== undefined) {
      entity.fecha_inscripcion = dto.fecha_inscripcion;
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.equipo_id !== undefined) entity.equipo_id = dto.equipo_id;
    return entity;
  }

  static toResponseDto(entity: Inscripcion): InscripcionResponseDto {
    return {
      id: entity.id,
      fecha_inscripcion: entity.fecha_inscripcion,
      estado: entity.estado,
      equipo_id: entity.equipo_id,
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };
  }

  static toResponseDtoList(entities: Inscripcion[]): InscripcionResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
```

El mapper de actualización no asigna `torneo_id`; el service resuelve la entidad relacionada y la asigna a `entity.torneo`.

## 7) Repositorio para el reporte

Archivo: `src/inscripciones/repositories/inscripciones.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class InscripcionesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countByTorneo(torneoId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS total_inscripciones
       FROM inscripciones
       WHERE torneo_id = ?`,
      [torneoId],
    );
    return Number(row.total_inscripciones);
  }
}
```

El parámetro se pasa como valor SQL, no se concatena en la consulta.

## 8) Module de `Inscripcion`

Archivo: `src/inscripciones/inscripciones.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesRepository } from './repositories/inscripciones.repository';
import { InscripcionesService } from './inscripciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion, Torneo])],
  controllers: [InscripcionesController],
  providers: [InscripcionesService, InscripcionesRepository],
  exports: [InscripcionesService],
})
export class InscripcionesModule {}
```

Importa `InscripcionesModule` en `AppModule`. Asegúrate de que la configuración de TypeORM descubra ambas entidades. `TorneosModule` puede permanecer independiente: la relación inversa de TypeORM no exige inyectar `InscripcionesService` dentro de `TorneosService`.

## 9) Servicio de `Inscripcion`

Archivo: `src/inscripciones/inscripciones.service.ts`

El service debe implementar estas reglas:

1. Antes de crear una inscripción, buscar el torneo por `torneo_id`; si no existe, lanzar `NotFoundException`.
2. Antes de reasignar una inscripción a otro torneo, buscar y validar el torneo nuevo.
3. Cargar `relations: { torneo: true }` para mapear `torneo_id` en las respuestas.
4. Antes de consultar el reporte, comprobar que el torneo exista.
5. Si la inscripción solicitada no existe, responder `404 Not Found`.

Implementación de referencia:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscripcionResponseDto } from './dto/inscripcion-response.dto';
import { TorneoInscripcionesReportDto } from './dto/torneo-inscripciones-report.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionMapper } from './mappers/inscripcion.mapper';
import { InscripcionesRepository } from './repositories/inscripciones.repository';

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    private readonly customInscripcionesRepository: InscripcionesRepository,
  ) {}

  async create(dto: CreateInscripcionDto): Promise<InscripcionResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const entity = InscripcionMapper.toEntity(dto, torneo);
    const saved = await this.inscripcionesRepository.save(entity);
    return InscripcionMapper.toResponseDto(saved);
  }

  async findAll(): Promise<InscripcionResponseDto[]> {
    const inscripciones = await this.inscripcionesRepository.find({
      relations: { torneo: true },
    });
    return InscripcionMapper.toResponseDtoList(inscripciones);
  }

  async findOne(id: string): Promise<InscripcionResponseDto> {
    return InscripcionMapper.toResponseDto(await this.findInscripcion(id));
  }

  async update(
    id: string,
    dto: UpdateInscripcionDto,
  ): Promise<InscripcionResponseDto> {
    const inscripcion = await this.findInscripcion(id);
    if (dto.torneo_id !== undefined) {
      inscripcion.torneo = await this.findTorneo(dto.torneo_id);
    }
    const saved = await this.inscripcionesRepository.save(
      InscripcionMapper.mergeEntity(inscripcion, dto),
    );
    return InscripcionMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const inscripcion = await this.findInscripcion(id);
    await this.inscripcionesRepository.remove(inscripcion);
    return { message: `Inscripcion #${id} deleted successfully` };
  }

  async getCountByTorneo(
    torneoId: string,
  ): Promise<TorneoInscripcionesReportDto> {
    await this.findTorneo(torneoId);
    return {
      torneo_id: torneoId,
      total_inscripciones:
        await this.customInscripcionesRepository.countByTorneo(torneoId),
    };
  }

  private async findInscripcion(id: string): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionesRepository.findOne({
      where: { id },
      relations: { torneo: true },
    });
    if (!inscripcion) {
      throw new NotFoundException(`Inscripcion with id ${id} not found`);
    }
    return inscripcion;
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException(`Torneo with id ${id} not found`);
    }
    return torneo;
  }
}
```

## 10) Rutas de `InscripcionesController`

Declara el reporte antes de `@Get(':id')`, para que la ruta fija `reports/...` no se interprete como un UUID de inscripción.

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import { InscripcionesService } from './inscripciones.service';

@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post()
  create(@Body() dto: CreateInscripcionDto) {
    return this.inscripcionesService.create(dto);
  }

  @Get('reports/torneo/:torneoId/count')
  getCountByTorneo(@Param('torneoId', ParseUUIDPipe) torneoId: string) {
    return this.inscripcionesService.getCountByTorneo(torneoId);
  }

  @Get()
  findAll() {
    return this.inscripcionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInscripcionDto,
  ) {
    return this.inscripcionesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.remove(id);
  }
}
```

Rutas resultantes:

- `POST /inscripciones`: crea una inscripción asociada a un torneo existente.
- `GET /inscripciones`: lista las inscripciones con `torneo_id`.
- `GET /inscripciones/:id`: consulta una inscripción por UUID.
- `PATCH /inscripciones/:id`: actualiza sus datos y puede reasignarla a otro torneo existente.
- `DELETE /inscripciones/:id`: elimina una inscripción.
- `GET /inscripciones/reports/torneo/:torneoId/count`: cuenta las inscripciones del torneo.

## 11) Pruebas en Postman

Usa `Content-Type: application/json`. Primero crea un deporte mediante `POST /deportes`, luego crea el torneo enviando su UUID como `deporte_id`.

### 11.1 Crear torneo (si todavía no existe)

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

Copia el `id` UUID de la respuesta. Ese es el valor que se usará como `torneo_id`; no uses un ID inventado.

### 11.2 Crear inscripción asociada al torneo

`POST http://localhost:3000/inscripciones`

```json
{
  "fecha_inscripcion": "2026-03-01",
  "estado": "PENDIENTE",
  "equipo_id": "UUID_EQUIPO_EXISTENTE",
  "torneo_id": "ID_DEVUELTO_POR_POST_TORNEOS"
}
```

Reemplaza `UUID_EQUIPO_EXISTENTE` por el UUID real del equipo que se inscribe. La API valida su formato, pero esta guía no verifica que exista en la base de datos porque no implementa el módulo ni la FK de Equipo. La respuesta debe contener un `id` nuevo para la inscripción, el mismo `equipo_id` enviado y el mismo `torneo_id`.

### 11.3 Comprobar la relación y el reporte

- `GET http://localhost:3000/inscripciones` debe listar la inscripción con su `torneo_id`.
- `GET http://localhost:3000/torneos/ID_DEL_TORNEO/inscripciones` puede agregarse como ruta anidada opcional en `TorneosController`; si se implementa, debe verificar primero que exista el torneo.
- `GET http://localhost:3000/inscripciones/reports/torneo/ID_DEL_TORNEO/count` debe devolver:

```json
{
  "torneo_id": "ID_DEL_TORNEO",
  "total_inscripciones": 1
}
```

La prueba principal pasa si el torneo se crea primero, el UUID real devuelto se usa en la inscripción y las consultas/reporte confirman su asociación.

### 11.4 Comprobar errores y borrado en cascada

- Un cuerpo con `equipo_id` o `torneo_id` con UUID mal formado debe responder `400 Bad Request`.
- Un UUID válido que no corresponda a un torneo existente debe responder `404 Not Found` al crear o reasignar una inscripción.
- Una inscripción inexistente debe responder `404 Not Found`.
- Al borrar un torneo con `ON DELETE CASCADE`, sus inscripciones también se eliminan; confirma la política aprobada antes de probarlo.

## 12) Resumen

1. `Torneo` es el lado uno e incluye `inscripciones` con `@OneToMany`.
2. `Inscripcion` es el lado muchos y dueño de `inscripciones.torneo_id` con `@ManyToOne` y `@JoinColumn`.
3. La FK no es única y toda inscripción requiere un torneo existente.
4. El service resuelve el UUID del torneo antes de crear o reasignar; no guarda relaciones anidadas ni depende de cascadas ORM.
5. La migración crea `inscripciones` y agrega la FK hacia la tabla de Torneo existente.
6. El CRUD y el reporte permiten probar que un Torneo tiene varias Inscripciones.
7. `equipo_id` se almacena como UUID, pero esta guía no crea la entidad Equipo ni su FK; coordina esa relación con su responsable.
