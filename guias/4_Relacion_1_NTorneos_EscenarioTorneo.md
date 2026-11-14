# Relación uno a muchos entre `Torneo` y `EscenarioTorneo` en NestJS

## Objetivo y alcance

Implementar el CRUD de asignaciones de escenarios a torneos y comprobar en la API que:

- Un `Torneo` puede tener muchas asignaciones de escenario.
- Cada `EscenarioTorneo` pertenece a un solo torneo.
- La llave foránea `torneo_id` se almacena en la tabla `escenarios_torneo` y apunta a `torneos.id`.
- Cada registro guarda `escenario_id` como UUID del escenario asignado.
- Para crear una asignación se envía el UUID de un torneo existente y un `escenario_id`.

La entidad y el CRUD de `Torneo` ya existen. Esta guía los reutiliza: solo se agrega la relación inversa `escenarios_torneo` a la entidad existente y se crea el recurso `EscenarioTorneo` con sus DTOs, mapper, repositorio, service, controller, pruebas y migración.

Esta parte del trabajo **no implementa ni modifica la entidad, módulo, tabla o CRUD de `Escenario`**. `escenario_id` se almacena y valida como UUID, pero no se agrega una FK física a la tabla de Escenario ni se comprueba que ese escenario exista. Esa relación queda a cargo de quien implemente Escenario y deberá coordinarse cuando se conozca el nombre real de su tabla y clave primaria.

## Atributos de `EscenarioTorneo`

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único del registro; lo genera la base de datos. |
| `fecha_asignacion` | Date | Fecha en que se asigna el escenario al torneo. En JSON se envía como `YYYY-MM-DD`. |
| `estado` | Enum | Estado de la asignación: `ACTIVO` o `INACTIVO`. |
| `escenario_id` | UUID | Identificador del escenario deportivo asignado. Se almacena como UUID; esta guía no implementa ni crea su FK. |
| `torneo_id` | UUID | Identificador del torneo al que se asigna el escenario; FK hacia `torneos.id`. |

En código y base de datos se usará `snake_case` (`fecha_asignacion`) para mantener consistencia con las entidades y los contratos actuales. Corresponde al atributo de dominio `fechaAsignacion`.

## 1) Lado dueño de la relación

El lado dueño es `EscenarioTorneo`, porque la FK hacia el torneo reside en su tabla:

- `escenarios_torneo.torneo_id` → `torneos.id`

Por eso, `@ManyToOne()` y `@JoinColumn()` se declaran en `EscenarioTorneo`. `Torneo` expone el lado inverso mediante `@OneToMany()`. La columna `torneo_id` no debe tener restricción `UNIQUE`: un torneo puede tener muchas asignaciones.

`escenario_id` es otro identificador UUID, pero no es la relación ORM implementada en esta guía. No uses `@ManyToOne()` hacia una clase `Escenario` inexistente ni agregues una restricción FK a una tabla cuyo esquema no está bajo este alcance.

## 2) Estructura de archivos

```text
src/
├── torneos/
│   └── entities/
│       └── torneo.entity.ts                  # agregar relación inversa
├── escenarios-torneo/
│   ├── dto/
│   │   ├── create-escenario-torneo.dto.ts
│   │   ├── update-escenario-torneo.dto.ts
│   │   ├── escenario-torneo-response.dto.ts
│   │   └── torneo-escenarios-report.dto.ts
│   ├── entities/
│   │   └── escenario-torneo.entity.ts
│   ├── mappers/
│   │   └── escenario-torneo.mapper.ts
│   ├── repositories/
│   │   └── escenarios-torneo.repository.ts
│   ├── escenarios-torneo.controller.ts
│   ├── escenarios-torneo.service.ts
│   └── escenarios-torneo.module.ts
├── migrations/
│   └── <timestamp>-CreateEscenariosTorneoRelation.ts
└── app.module.ts
```

Genera un recurso REST si resulta útil:

```bash
nest g resource escenarios-torneo --no-spec
```

Selecciona **REST API** y organiza el recurso según la estructura anterior. No generes otra entidad ni otro CRUD de Torneo si ya se implementaron siguiendo la guía relacionada.

## 3) Entidades

### 3.1 Agregar la relación inversa a `Torneo`

Archivo: `src/torneos/entities/torneo.entity.ts`

Importa `EscenarioTorneo` y `OneToMany`, conservando todos los atributos y relaciones existentes de Torneo:

```typescript
import { EscenarioTorneo } from '../../escenarios-torneo/entities/escenario-torneo.entity';
import { OneToMany } from 'typeorm';
```

Dentro de `Torneo`, agrega:

```typescript
@OneToMany(
  () => EscenarioTorneo,
  (escenarioTorneo) => escenarioTorneo.torneo,
  { cascade: false },
)
escenarios_torneo?: EscenarioTorneo[];
```

La propiedad `escenarios_torneo` es una relación de navegación de TypeORM, no una columna en `torneos`. `cascade: false` evita crear o guardar asignaciones al guardar un torneo.

### 3.2 Crear `EscenarioTorneo` (lado dueño)

Archivo: `src/escenarios-torneo/entities/escenario-torneo.entity.ts`

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

export enum EstadoAsignacionEscenario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Entity('escenarios_torneo')
export class EscenarioTorneo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  fecha_asignacion!: string;

  @Column({
    type: 'enum',
    enum: EstadoAsignacionEscenario,
    default: EstadoAsignacionEscenario.ACTIVO,
  })
  estado!: EstadoAsignacionEscenario;

  @Column({ type: 'uuid' })
  escenario_id!: string;

  @ManyToOne(() => Torneo, (torneo) => torneo.escenarios_torneo, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Torneo;

  @RelationId((escenarioTorneo: EscenarioTorneo) => escenarioTorneo.torneo)
  torneo_id!: string;
}
```

`@RelationId` permite exponer el UUID del torneo en las respuestas, pero no asigna la relación al guardar. Para crear o reasignar una asignación, el service debe buscar el torneo y establecer `escenarioTorneo.torneo`.

`escenario_id` se persiste como UUID simple. No agregues una relación ORM ni una FK física hacia Escenario en esta etapa. La implementación responsable de Escenario podrá definirla después, con su tabla y clave primaria confirmadas.

`nullable: false` exige que toda asignación pertenezca a un torneo. `onDelete: 'CASCADE'` hace que MySQL elimine las asignaciones al borrar su torneo. Confirma que esa política sea la deseada antes de aplicar la migración.

## 4) Migración

La tabla `torneos` y su migración deben existir y estar aplicadas primero. No uses `synchronize: true` ni edites una migración ya aplicada. Genera una migración nueva:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/CreateEscenariosTorneoRelation -d ./typeorm.config.ts
```

Revisa que la migración:

- Cree `escenarios_torneo` con `id`, `fecha_asignacion`, `estado`, `escenario_id` y `torneo_id`.
- Incluya `estado` como enum con los valores `ACTIVO` e `INACTIVO`.
- Almacene `escenario_id` como UUID (`varchar(36)` en este proyecto), sin FK a Escenario.
- Agregue una FK desde `escenarios_torneo.torneo_id` hacia `torneos.id`.
- Defina `ON DELETE CASCADE`, si fue aprobada.
- No cree un índice `UNIQUE` en `torneo_id`.
- Use para UUID una representación compatible con `torneos.id` (`varchar(36)` en este proyecto).

Si la tabla `escenarios_torneo` ya contiene datos, primero garantiza que cada `torneo_id` corresponda a un Torneo existente. De lo contrario, MySQL rechazará la FK.

Aplica la migración solo después de revisarla:

```bash
npm run migration:run
```

## 5) DTOs

Los ejemplos usan nombres `snake_case` para mantener consistencia con las entidades y los contratos actuales.

### 5.1 DTO de creación

Archivo: `src/escenarios-torneo/dto/create-escenario-torneo.dto.ts`

```typescript
import { IsDateString, IsEnum, IsUUID, Matches } from 'class-validator';
import { EstadoAsignacionEscenario } from '../entities/escenario-torneo.entity';

export class CreateEscenarioTorneoDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_asignacion!: string;

  @IsEnum(EstadoAsignacionEscenario)
  estado!: EstadoAsignacionEscenario;

  @IsUUID()
  escenario_id!: string;

  @IsUUID()
  torneo_id!: string;
}
```

`id` lo genera la base de datos. El cliente envía `torneo_id`, no un objeto `torneo` anidado. `escenario_id` se valida por formato UUID; no se consulta ni se valida su existencia en la base de datos.

### 5.2 DTO de actualización

Archivo: `src/escenarios-torneo/dto/update-escenario-torneo.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEscenarioTorneoDto } from './create-escenario-torneo.dto';

export class UpdateEscenarioTorneoDto extends PartialType(
  CreateEscenarioTorneoDto,
) {}
```

En `PATCH`, todos los campos son opcionales. Si llega `torneo_id`, el service busca el torneo destino y lo asigna solo si existe. `escenario_id` solo se valida por formato UUID.

### 5.3 DTO de respuesta

Archivo: `src/escenarios-torneo/dto/escenario-torneo-response.dto.ts`

```typescript
import { EstadoAsignacionEscenario } from '../entities/escenario-torneo.entity';

export class EscenarioTorneoResponseDto {
  id!: string;
  fecha_asignacion!: string;
  estado!: EstadoAsignacionEscenario;
  escenario_id!: string;
  torneo_id!: string;
}
```

### 5.4 DTO del reporte de asignaciones

Archivo: `src/escenarios-torneo/dto/torneo-escenarios-report.dto.ts`

```typescript
export class TorneoEscenariosReportDto {
  torneo_id!: string;
  total_escenarios!: number;
}
```

El reporte permite comprobar cuántos registros de asignación quedaron asociados a un torneo.

## 6) Mapper de `EscenarioTorneo`

Archivo: `src/escenarios-torneo/mappers/escenario-torneo.mapper.ts`

```typescript
import { CreateEscenarioTorneoDto } from '../dto/create-escenario-torneo.dto';
import { EscenarioTorneoResponseDto } from '../dto/escenario-torneo-response.dto';
import { UpdateEscenarioTorneoDto } from '../dto/update-escenario-torneo.dto';
import { EscenarioTorneo } from '../entities/escenario-torneo.entity';

export class EscenarioTorneoMapper {
  static toEntity(
    dto: CreateEscenarioTorneoDto,
    torneo: EscenarioTorneo['torneo'],
  ): EscenarioTorneo {
    return Object.assign(new EscenarioTorneo(), {
      fecha_asignacion: dto.fecha_asignacion,
      estado: dto.estado,
      escenario_id: dto.escenario_id,
      torneo,
    });
  }

  static mergeEntity(
    entity: EscenarioTorneo,
    dto: UpdateEscenarioTorneoDto,
  ): EscenarioTorneo {
    if (dto.fecha_asignacion !== undefined) {
      entity.fecha_asignacion = dto.fecha_asignacion;
    }
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.escenario_id !== undefined) {
      entity.escenario_id = dto.escenario_id;
    }
    return entity;
  }

  static toResponseDto(entity: EscenarioTorneo): EscenarioTorneoResponseDto {
    return {
      id: entity.id,
      fecha_asignacion: entity.fecha_asignacion,
      estado: entity.estado,
      escenario_id: entity.escenario_id,
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };
  }

  static toResponseDtoList(
    entities: EscenarioTorneo[],
  ): EscenarioTorneoResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
```

El mapper de actualización no asigna `torneo_id`; el service resuelve la entidad relacionada y la asigna a `entity.torneo`.

## 7) Repositorio para el reporte

Archivo: `src/escenarios-torneo/repositories/escenarios-torneo.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EscenariosTorneoRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countByTorneo(torneoId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS total_escenarios
       FROM escenarios_torneo
       WHERE torneo_id = ?`,
      [torneoId],
    );
    return Number(row.total_escenarios);
  }
}
```

El parámetro se pasa como valor SQL, no se concatena en la consulta.

## 8) Módulo de `EscenarioTorneo`

Archivo: `src/escenarios-torneo/escenarios-torneo.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { EscenarioTorneo } from './entities/escenario-torneo.entity';
import { EscenariosTorneoController } from './escenarios-torneo.controller';
import { EscenariosTorneoRepository } from './repositories/escenarios-torneo.repository';
import { EscenariosTorneoService } from './escenarios-torneo.service';

@Module({
  imports: [TypeOrmModule.forFeature([EscenarioTorneo, Torneo])],
  controllers: [EscenariosTorneoController],
  providers: [EscenariosTorneoService, EscenariosTorneoRepository],
  exports: [EscenariosTorneoService],
})
export class EscenariosTorneoModule {}
```

Importa `EscenariosTorneoModule` en `AppModule`. Asegúrate de que la configuración de TypeORM descubra ambas entidades. `TorneosModule` puede permanecer independiente: la relación inversa de TypeORM no exige inyectar `EscenariosTorneoService` dentro de `TorneosService`.

## 9) Servicio de `EscenarioTorneo`

El service debe implementar estas reglas:

1. Antes de crear una asignación, buscar el torneo por `torneo_id`; si no existe, lanzar `NotFoundException`.
2. Antes de reasignar una asignación a otro torneo, buscar y validar el torneo nuevo.
3. Cargar `relations: { torneo: true }` para mapear `torneo_id` en las respuestas.
4. Antes de consultar el reporte, comprobar que el torneo exista.
5. Si la asignación solicitada no existe, responder `404 Not Found`.
6. Validar `escenario_id` como UUID en el DTO, pero no buscar ni guardar una relación ORM con Escenario.

Implementación de referencia:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateEscenarioTorneoDto } from './dto/create-escenario-torneo.dto';
import { EscenarioTorneoResponseDto } from './dto/escenario-torneo-response.dto';
import { TorneoEscenariosReportDto } from './dto/torneo-escenarios-report.dto';
import { UpdateEscenarioTorneoDto } from './dto/update-escenario-torneo.dto';
import { EscenarioTorneo } from './entities/escenario-torneo.entity';
import { EscenarioTorneoMapper } from './mappers/escenario-torneo.mapper';
import { EscenariosTorneoRepository } from './repositories/escenarios-torneo.repository';

@Injectable()
export class EscenariosTorneoService {
  constructor(
    @InjectRepository(EscenarioTorneo)
    private readonly escenariosTorneoRepository: Repository<EscenarioTorneo>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    private readonly customEscenariosTorneoRepository: EscenariosTorneoRepository,
  ) {}

  async create(
    dto: CreateEscenarioTorneoDto,
  ): Promise<EscenarioTorneoResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const entity = EscenarioTorneoMapper.toEntity(dto, torneo);
    const saved = await this.escenariosTorneoRepository.save(entity);
    return EscenarioTorneoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EscenarioTorneoResponseDto[]> {
    const asignaciones = await this.escenariosTorneoRepository.find({
      relations: { torneo: true },
    });
    return EscenarioTorneoMapper.toResponseDtoList(asignaciones);
  }

  async findOne(id: string): Promise<EscenarioTorneoResponseDto> {
    return EscenarioTorneoMapper.toResponseDto(await this.findAsignacion(id));
  }

  async update(
    id: string,
    dto: UpdateEscenarioTorneoDto,
  ): Promise<EscenarioTorneoResponseDto> {
    const asignacion = await this.findAsignacion(id);
    if (dto.torneo_id !== undefined) {
      asignacion.torneo = await this.findTorneo(dto.torneo_id);
    }
    const saved = await this.escenariosTorneoRepository.save(
      EscenarioTorneoMapper.mergeEntity(asignacion, dto),
    );
    return EscenarioTorneoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const asignacion = await this.findAsignacion(id);
    await this.escenariosTorneoRepository.remove(asignacion);
    return { message: `EscenarioTorneo #${id} deleted successfully` };
  }

  async getCountByTorneo(
    torneoId: string,
  ): Promise<TorneoEscenariosReportDto> {
    await this.findTorneo(torneoId);
    return {
      torneo_id: torneoId,
      total_escenarios:
        await this.customEscenariosTorneoRepository.countByTorneo(torneoId),
    };
  }

  private async findAsignacion(id: string): Promise<EscenarioTorneo> {
    const asignacion = await this.escenariosTorneoRepository.findOne({
      where: { id },
      relations: { torneo: true },
    });
    if (!asignacion) {
      throw new NotFoundException(
        `EscenarioTorneo with id ${id} not found`,
      );
    }
    return asignacion;
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

## 10) Rutas de `EscenariosTorneoController`

Declara el reporte antes de `@Get(':id')`, para que la ruta fija `reports/...` no se interprete como un UUID de asignación.

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
import { CreateEscenarioTorneoDto } from './dto/create-escenario-torneo.dto';
import { UpdateEscenarioTorneoDto } from './dto/update-escenario-torneo.dto';
import { EscenariosTorneoService } from './escenarios-torneo.service';

@Controller('escenarios-torneo')
export class EscenariosTorneoController {
  constructor(
    private readonly escenariosTorneoService: EscenariosTorneoService,
  ) {}

  @Post()
  create(@Body() dto: CreateEscenarioTorneoDto) {
    return this.escenariosTorneoService.create(dto);
  }

  @Get('reports/torneo/:torneoId/count')
  getCountByTorneo(@Param('torneoId', ParseUUIDPipe) torneoId: string) {
    return this.escenariosTorneoService.getCountByTorneo(torneoId);
  }

  @Get()
  findAll() {
    return this.escenariosTorneoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.escenariosTorneoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscenarioTorneoDto,
  ) {
    return this.escenariosTorneoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.escenariosTorneoService.remove(id);
  }
}
```

Rutas resultantes:

- `POST /escenarios-torneo`: crea una asignación asociada a un torneo existente.
- `GET /escenarios-torneo`: lista asignaciones con `torneo_id`.
- `GET /escenarios-torneo/:id`: consulta una asignación por UUID.
- `PATCH /escenarios-torneo/:id`: actualiza sus datos y puede reasignarla a otro torneo existente.
- `DELETE /escenarios-torneo/:id`: elimina una asignación.
- `GET /escenarios-torneo/reports/torneo/:torneoId/count`: cuenta las asignaciones de un torneo.

## 11) Pruebas en Postman

Usa `Content-Type: application/json`. Primero crea un deporte mediante `POST /deportes`, luego crea el torneo con su UUID en `deporte_id`; después crea la asignación del escenario.

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

Copia el `id` UUID de la respuesta. Ese será el valor de `torneo_id`; no uses un ID inventado.

### 11.2 Crear una asignación de escenario al torneo

`POST http://localhost:3000/escenarios-torneo`

```json
{
  "fecha_asignacion": "2026-11-08",
  "estado": "ACTIVO",
  "escenario_id": "UUID_DEL_ESCENARIO",
  "torneo_id": "ID_DEVUELTO_POR_POST_TORNEOS"
}
```

Reemplaza `UUID_DEL_ESCENARIO` por el UUID proporcionado por el módulo responsable de Escenario y `ID_DEVUELTO_POR_POST_TORNEOS` por el UUID real del torneo. Esta API valida el formato de ambos UUID, pero solo comprueba que exista el torneo; no verifica la existencia del escenario.

Puedes crear varias asignaciones para un mismo torneo, cada una con un registro en `escenarios_torneo`. La respuesta debe incluir un `id` nuevo y los mismos valores de `escenario_id` y `torneo_id` enviados.

### 11.3 Comprobar la relación y el reporte

- `GET http://localhost:3000/escenarios-torneo` debe listar las asignaciones con `torneo_id`.
- `GET http://localhost:3000/torneos/ID_DEL_TORNEO/escenarios-torneo` puede agregarse como ruta anidada opcional en `TorneosController`; si se implementa, debe verificar primero que exista el torneo.
- `GET http://localhost:3000/escenarios-torneo/reports/torneo/ID_DEL_TORNEO/count` debe devolver:

```json
{
  "torneo_id": "ID_DEL_TORNEO",
  "total_escenarios": 1
}
```

La prueba principal pasa si se crea primero el torneo, se usa su UUID real para crear una o más asignaciones y las consultas/reporte confirman la asociación.

### 11.4 Comprobar errores y borrado en cascada

- Un cuerpo con `escenario_id` o `torneo_id` mal formado debe responder `400 Bad Request`.
- Un UUID válido que no corresponda a un torneo existente debe responder `404 Not Found` al crear o reasignar una asignación.
- Un UUID de escenario con formato válido se acepta sin consultar la tabla de Escenario; esa verificación corresponde al responsable de ese módulo.
- Una asignación inexistente debe responder `404 Not Found`.
- Al borrar un torneo con `ON DELETE CASCADE`, sus asignaciones también se eliminan; confirma la política aprobada antes de probarlo.

## 12) Resumen

1. `Torneo` es el lado uno e incluye `escenarios_torneo` con `@OneToMany`.
2. `EscenarioTorneo` es el lado muchos y dueño de `escenarios_torneo.torneo_id` con `@ManyToOne` y `@JoinColumn`.
3. La FK `torneo_id` no es única y toda asignación requiere un torneo existente.
4. El service resuelve el UUID del torneo antes de crear o reasignar; no guarda relaciones anidadas ni depende de cascadas ORM.
5. `escenario_id` se almacena como UUID simple; esta guía no crea la entidad Escenario ni su FK.
6. La migración crea la tabla de asignaciones y agrega únicamente la FK hacia la tabla de Torneo.
7. El CRUD y el reporte permiten probar que un Torneo puede tener muchas asignaciones de escenario.
