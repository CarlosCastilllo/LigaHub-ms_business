# 1 — CRUD de Fases en NestJS

En esta guía construiremos el CRUD para las fases de un torneo. `Fase` es una clase abstracta que contiene los datos comunes. No se crean instancias genéricas de esa clase: se crean sus subclases concretas `FaseGrupos` o `FaseFinal`.

Usaremos herencia de tabla única (STI) de TypeORM. Las dos subclases se guardan en la tabla `fases`; el discriminador `tipo` identifica cuál se creó. Los campos específicos de la otra subclase quedan vacíos en cada fila.

## 1) Cómo funciona el CRUD de una clase abstracta

Sí existe un único `POST /fases`. El cuerpo lleva `tipo`, y el servicio selecciona la subclase concreta:

- Si `tipo` es `GRUPOS`, se crea una instancia de `FaseGrupos`.
- Si `tipo` es `FINAL`, se crea una instancia de `FaseFinal`.

El endpoint no hace `new Fase()`. Para validar correctamente los campos específicos de cada tipo, el controller usa un pipe que selecciona el DTO concreto antes de validar el cuerpo.

Las operaciones de consulta, actualización y eliminación se comparten: consultan el repositorio de `Fase` y TypeORM devuelve la subclase concreta según el discriminador almacenado. La actualización puede modificar los campos comunes y los campos propios del tipo de fase, pero no permite cambiar `tipo`.

## 2) Atributos

### Atributos comunes

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único de la fase. |
| `numero_orden` | Integer | Posición de la fase dentro del torneo. |
| `fecha_inicio` | Date | Fecha en que comienza la fase. |
| `fecha_fin` | Date | Fecha en que termina la fase. |
| `estado` | Enum | Estado actual: `PENDIENTE`, `EN_CURSO` o `FINALIZADA`. |
| `torneo_id` | UUID | Identificador del torneo al que pertenece la fase (clave foránea). |
| `tipo` | Enum/discriminador | Tipo concreto de fase: `GRUPOS` o `FINAL`. TypeORM lo almacena como discriminador. |

### Atributos de `FaseGrupos`

| Atributo | Tipo | Descripción |
|---|---|---|
| `cantidad_grupos` | Integer | Número de grupos en que se divide esta fase. |
| `equipos_por_grupo` | Integer | Cantidad de equipos asignados a cada grupo. |

### Atributos de `FaseFinal`

| Atributo | Tipo | Descripción |
|---|---|---|
| `numero_partidos` | Integer | Número de partidos que componen esta fase final. |
| `modalidad` | Enum | Formato de disputa: `PARTIDO_UNICO` o `IDA_Y_VUELTA`. |

Los atributos particulares son ejemplos para esta guía y se pueden reemplazar por los que defina el dominio. Al usar STI, las columnas específicas de cada subtipo deben ser `nullable: true`, porque no corresponden a las filas del otro subtipo.

Los nombres de los atributos se mantienen en `snake_case` en las entidades, DTOs, respuestas JSON y columnas de base de datos. Los nombres de clases, archivos y métodos siguen las convenciones habituales de TypeScript/NestJS.

## 3) Endpoints

- `POST /fases` (el cuerpo indica el tipo concreto y sus atributos)
- `GET /fases`
- `GET /fases/:id`
- `PATCH /fases/:id`
- `DELETE /fases/:id`

## 4) Estructura

```text
src/
└── fases/
    ├── dto/
    │   ├── create-fase.dto.ts
    │   ├── create-fase-grupos.dto.ts
    │   ├── create-fase-final.dto.ts
    │   ├── update-fase.dto.ts
    │   └── fase-response.dto.ts
    ├── entities/
    │   ├── fase.entity.ts
    │   ├── fase-grupos.entity.ts
    │   └── fase-final.entity.ts
    ├── pipes/
    │   └── create-fase-validation.pipe.ts
    ├── validators/
    │   └── fecha-fin-no-anterior.constraint.ts
    ├── mappers/
    │   └── fase.mapper.ts
    ├── fases.controller.ts
    ├── fases.service.ts
    └── fases.module.ts
```

Genera el recurso REST inicial si lo necesitas:

```bash
nest g resource fases
```

Selecciona REST API cuando el CLI lo pida. Después organiza los archivos de acuerdo con la estructura anterior.

## 5) Entidades

### 5.1 Clase abstracta `Fase`

Archivo: `src/fases/entities/fase.entity.ts`

```typescript
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';

export enum EstadoFase {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
}

export enum TipoFase {
  GRUPOS = 'GRUPOS',
  FINAL = 'FINAL',
}

@Entity('fases')
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Fase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  numero_orden!: number;

  @Column({ type: 'date' })
  fecha_inicio!: string;

  @Column({ type: 'date' })
  fecha_fin!: string;

  @Column({ type: 'enum', enum: EstadoFase, default: EstadoFase.PENDIENTE })
  estado!: EstadoFase;

  @Column({ type: 'uuid' })
  torneo_id!: string;
}
```

`tipo` no se declara como `@Column`: `@TableInheritance` crea y administra la columna discriminadora. Los valores que TypeORM debe almacenar se registran en las subclases mediante `@ChildEntity`.

### 5.2 Subclase `FaseGrupos`

Archivo: `src/fases/entities/fase-grupos.entity.ts`

```typescript
import { ChildEntity, Column } from 'typeorm';
import { Fase } from './fase.entity';

@ChildEntity('GRUPOS')
export class FaseGrupos extends Fase {
  @Column({ type: 'int', nullable: true })
  cantidad_grupos!: number | null;

  @Column({ type: 'int', nullable: true })
  equipos_por_grupo!: number | null;
}
```

Las columnas son opcionales en la tabla compartida para permitir filas `FINAL`; el DTO de creación de grupos las exige.

### 5.3 Subclase `FaseFinal`

Archivo: `src/fases/entities/fase-final.entity.ts`

```typescript
import { ChildEntity, Column } from 'typeorm';
import { Fase } from './fase.entity';

export enum ModalidadFinal {
  PARTIDO_UNICO = 'PARTIDO_UNICO',
  IDA_Y_VUELTA = 'IDA_Y_VUELTA',
}

@ChildEntity('FINAL')
export class FaseFinal extends Fase {
  @Column({ type: 'int', nullable: true })
  numero_partidos!: number | null;

  @Column({
    type: 'enum',
    enum: ModalidadFinal,
    nullable: true,
  })
  modalidad!: ModalidadFinal | null;
}
```

## 6) DTOs

### 6.1 DTO base de creación

Archivo: `src/fases/dto/create-fase.dto.ts`

```typescript
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  Matches,
  Min,
  Validate,
} from 'class-validator';
import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { FechaFinNoAnteriorConstraint } from '../validators/fecha-fin-no-anterior.constraint';

export class CreateFaseDto {
  @IsEnum(TipoFase)
  tipo!: TipoFase;

  @IsInt()
  @Min(1)
  numero_orden!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @Validate(FechaFinNoAnteriorConstraint)
  fecha_fin!: string;

  @IsEnum(EstadoFase)
  estado!: EstadoFase;

  @IsUUID()
  torneo_id!: string;
}
```

Este DTO contiene los campos comunes y el discriminador. El pipe de validación lo convierte al DTO concreto antes de validar la petición.

La regla de fechas permite que ambas coincidan (una fase que ocurre en un solo día), pero no permite que `fecha_fin` sea anterior a `fecha_inicio`.

### Validador para el rango de fechas

Archivo: `src/fases/validators/fecha-fin-no-anterior.constraint.ts`

```typescript
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'fecha_fin_no_anterior', async: false })
export class FechaFinNoAnteriorConstraint
  implements ValidatorConstraintInterface
{
  validate(fecha_fin: unknown, args?: ValidationArguments): boolean {
    const { fecha_inicio } = (args?.object ?? {}) as {
      fecha_inicio?: unknown;
    };

    if (typeof fecha_inicio !== 'string' || typeof fecha_fin !== 'string') {
      return true;
    }

    return fecha_fin >= fecha_inicio;
  }

  defaultMessage(): string {
    return 'fecha_fin debe ser igual o posterior a fecha_inicio';
  }
}
```

Los DTOs validan que ambas propiedades tengan formato `YYYY-MM-DD`; por eso la comparación lexicográfica de las cadenas corresponde al orden cronológico.

### 6.2 DTO de creación de grupos

Archivo: `src/fases/dto/create-fase-grupos.dto.ts`

```typescript
import { IsInt, Min } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';

export class CreateFaseGruposDto extends CreateFaseDto {
  @IsInt()
  @Min(1)
  cantidad_grupos!: number;

  @IsInt()
  @Min(2)
  equipos_por_grupo!: number;
}
```

### 6.3 DTO de creación de fase final

Archivo: `src/fases/dto/create-fase-final.dto.ts`

```typescript
import { IsEnum, IsInt, Min } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class CreateFaseFinalDto extends CreateFaseDto {
  @IsInt()
  @Min(1)
  numero_partidos!: number;

  @IsEnum(ModalidadFinal)
  modalidad!: ModalidadFinal;
}
```

### 6.4 Pipe que valida el DTO según `tipo`

Archivo: `src/fases/pipes/create-fase-validation.pipe.ts`

```typescript
import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFaseFinalDto } from '../dto/create-fase-final.dto';
import { CreateFaseGruposDto } from '../dto/create-fase-grupos.dto';
import { TipoFase } from '../entities/fase.entity';

export type CreateFaseInput = CreateFaseGruposDto | CreateFaseFinalDto;

@Injectable()
export class CreateFaseValidationPipe
  implements PipeTransform<unknown, Promise<CreateFaseInput>>
{
  async transform(value: unknown): Promise<CreateFaseInput> {
    if (typeof value !== 'object' || value === null || !('tipo' in value)) {
      throw new BadRequestException('El cuerpo debe incluir el campo tipo');
    }

    const tipo = value.tipo;
    let dtoClass: typeof CreateFaseGruposDto | typeof CreateFaseFinalDto;

    if (tipo === TipoFase.GRUPOS) {
      dtoClass = CreateFaseGruposDto;
    } else if (tipo === TipoFase.FINAL) {
      dtoClass = CreateFaseFinalDto;
    } else {
      throw new BadRequestException('tipo debe ser GRUPOS o FINAL');
    }

    const dto = plainToInstance(dtoClass, value);
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
```

El pipe usa el valor de `tipo` para elegir la clase que valida todos los campos. Así, por ejemplo, un cuerpo de tipo `GRUPOS` debe incluir `cantidad_grupos` y `equipos_por_grupo`, y no puede enviar propiedades exclusivas de `FINAL`.

### 6.5 DTO de actualización

Archivo: `src/fases/dto/update-fase.dto.ts`

```typescript
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, Min, ValidateIf } from 'class-validator';
import { CreateFaseDto } from './create-fase.dto';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class UpdateFaseDto extends PartialType(
  OmitType(CreateFaseDto, ['tipo'] as const),
) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  cantidad_grupos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(2)
  equipos_por_grupo?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  numero_partidos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ModalidadFinal)
  modalidad?: ModalidadFinal;
}
```

`tipo` no forma parte del DTO de actualización: una fase no cambia de subtipo con un `PATCH`. El service comprobará que los atributos particulares enviados correspondan al subtipo almacenado.

El `ValidationPipe` global valida los formatos y rangos simples del `PATCH`. El service vuelve a comprobar el orden de fechas después de combinar el cuerpo parcial con los valores guardados; así también se detecta el caso en que solo se modifica una de las dos fechas.

### 6.6 DTO de respuesta

Archivo: `src/fases/dto/fase-response.dto.ts`

```typescript
import { EstadoFase, TipoFase } from '../entities/fase.entity';
import { ModalidadFinal } from '../entities/fase-final.entity';

export class FaseResponseDto {
  id!: string;
  tipo!: TipoFase;
  numero_orden!: number;
  fecha_inicio!: string;
  fecha_fin!: string;
  estado!: EstadoFase;
  torneo_id!: string;
  cantidad_grupos?: number;
  equipos_por_grupo?: number;
  numero_partidos?: number;
  modalidad?: ModalidadFinal;
}
```

Los campos de ambas subclases son opcionales en la respuesta porque una fila solo tiene los valores propios de su tipo.

## 7) Mapper

Archivo: `src/fases/mappers/fase.mapper.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { UpdateFaseDto } from '../dto/update-fase.dto';
import { FaseResponseDto } from '../dto/fase-response.dto';
import { FaseFinal } from '../entities/fase-final.entity';
import { FaseGrupos } from '../entities/fase-grupos.entity';
import { Fase, TipoFase } from '../entities/fase.entity';
import type { CreateFaseInput } from '../pipes/create-fase-validation.pipe';

@Injectable()
export class FaseMapper {
  toEntity(dto: CreateFaseInput): Fase {
    const { tipo, ...atributos } = dto;
    switch (tipo) {
      case TipoFase.GRUPOS:
        return Object.assign(new FaseGrupos(), atributos);
      case TipoFase.FINAL:
        return Object.assign(new FaseFinal(), atributos);
      default:
        throw new Error('Unsupported Fase type');
    }
  }

  mergeEntity(entity: Fase, dto: UpdateFaseDto): Fase {
    if (dto.numero_orden !== undefined) entity.numero_orden = dto.numero_orden;
    if (dto.fecha_inicio !== undefined) entity.fecha_inicio = dto.fecha_inicio;
    if (dto.fecha_fin !== undefined) entity.fecha_fin = dto.fecha_fin;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    if (dto.torneo_id !== undefined) entity.torneo_id = dto.torneo_id;

    if (entity instanceof FaseGrupos) {
      if (dto.cantidad_grupos !== undefined) {
        entity.cantidad_grupos = dto.cantidad_grupos;
      }
      if (dto.equipos_por_grupo !== undefined) {
        entity.equipos_por_grupo = dto.equipos_por_grupo;
      }
    }

    if (entity instanceof FaseFinal) {
      if (dto.numero_partidos !== undefined) {
        entity.numero_partidos = dto.numero_partidos;
      }
      if (dto.modalidad !== undefined) entity.modalidad = dto.modalidad;
    }

    return entity;
  }

  toResponseDto(entity: Fase): FaseResponseDto {
    let tipo: TipoFase;
    if (entity instanceof FaseGrupos) {
      tipo = TipoFase.GRUPOS;
    } else if (entity instanceof FaseFinal) {
      tipo = TipoFase.FINAL;
    } else {
      throw new Error('Unsupported concrete Fase subtype');
    }

    const response: FaseResponseDto = {
      id: entity.id,
      tipo,
      numero_orden: entity.numero_orden,
      fecha_inicio: entity.fecha_inicio,
      fecha_fin: entity.fecha_fin,
      estado: entity.estado,
      torneo_id: entity.torneo_id,
    };

    if (entity instanceof FaseGrupos) {
      if (entity.cantidad_grupos !== null) {
        response.cantidad_grupos = entity.cantidad_grupos;
      }
      if (entity.equipos_por_grupo !== null) {
        response.equipos_por_grupo = entity.equipos_por_grupo;
      }
    } else if (entity instanceof FaseFinal) {
      if (entity.numero_partidos !== null) {
        response.numero_partidos = entity.numero_partidos;
      }
      if (entity.modalidad !== null) {
        response.modalidad = entity.modalidad;
      }
    }

    return response;
  }

  toResponseDtoList(entities: Fase[]): FaseResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
```

El pipe ya devuelve una instancia del DTO concreto. El mapper la convierte en una instancia de entidad concreta, conservando los atributos propios del subtipo.

## 8) Service

Archivo: `src/fases/fases.service.ts`

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaseResponseDto } from './dto/fase-response.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FaseFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { Fase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import type { CreateFaseInput } from './pipes/create-fase-validation.pipe';

@Injectable()
export class FasesService {
  constructor(
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    private readonly faseMapper: FaseMapper,
  ) {}

  async create(dto: CreateFaseInput): Promise<FaseResponseDto> {
    const entity = this.faseMapper.toEntity(dto);
    const saved = await this.fasesRepository.save(entity);
    return this.faseMapper.toResponseDto(saved);
  }

  async findAll(): Promise<FaseResponseDto[]> {
    const fases = await this.fasesRepository.find();
    return this.faseMapper.toResponseDtoList(fases);
  }

  async findOne(id: string): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({ where: { id } });
    if (!fase) {
      throw new NotFoundException(`Fase with id ${id} not found`);
    }
    return this.faseMapper.toResponseDto(fase);
  }

  async update(id: string, dto: UpdateFaseDto): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({ where: { id } });
    if (!fase) {
      throw new NotFoundException(`Fase with id ${id} not found`);
    }

    const hasGruposFields =
      dto.cantidad_grupos !== undefined || dto.equipos_por_grupo !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if (
      (fase instanceof FaseGrupos && hasFinalFields) ||
      (fase instanceof FaseFinal && hasGruposFields)
    ) {
      throw new BadRequestException(
        'Los atributos enviados no corresponden al tipo de fase',
      );
    }

    const updated = this.faseMapper.mergeEntity(fase, dto);
    if (updated.fecha_fin < updated.fecha_inicio) {
      throw new BadRequestException(
        'fecha_fin debe ser igual o posterior a fecha_inicio',
      );
    }

    const saved = await this.fasesRepository.save(updated);
    return this.faseMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const fase = await this.fasesRepository.findOne({ where: { id } });
    if (!fase) {
      throw new NotFoundException(`Fase with id ${id} not found`);
    }

    await this.fasesRepository.remove(fase);
    return { message: `Fase #${id} deleted successfully` };
  }
}
```

El CRUD común vive en `FasesService`; no hace falta duplicar un service por subclase cuando las operaciones son iguales. La diferenciación se necesita al crear y al leer o modificar los atributos particulares.

## 9) Controller

Archivo: `src/fases/fases.controller.ts`

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
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FasesService } from './fases.service';
import { CreateFaseValidationPipe } from './pipes/create-fase-validation.pipe';
import type { CreateFaseInput } from './pipes/create-fase-validation.pipe';

@Controller('fases')
export class FasesController {
  constructor(private readonly fasesService: FasesService) {}

  @Post()
  create(@Body(CreateFaseValidationPipe) dto: CreateFaseInput) {
    return this.fasesService.create(dto);
  }

  @Get()
  findAll() {
    return this.fasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaseDto,
  ) {
    return this.fasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.remove(id);
  }
}
```

## 10) Module

Archivo: `src/fases/fases.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FasesController } from './fases.controller';
import { FasesService } from './fases.service';
import { FaseFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { Fase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { CreateFaseValidationPipe } from './pipes/create-fase-validation.pipe';

@Module({
  imports: [TypeOrmModule.forFeature([Fase, FaseGrupos, FaseFinal])],
  controllers: [FasesController],
  providers: [FasesService, FaseMapper, CreateFaseValidationPipe],
  exports: [FasesService],
})
export class FasesModule {}
```

Registra `FasesModule` en `AppModule`. Para validar el DTO de actualización, activa el `ValidationPipe` global en `main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## 11) Probar el CRUD (Postman)

### Crear una fase de grupos

`POST /fases`

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

### Crear una fase final

`POST /fases`

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

### Listar todas las fases

`GET /fases`

La respuesta de cada fase incluye `tipo` y solo los atributos específicos que correspondan a su subtipo.

Ejemplo de respuesta para una fase de grupos:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
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

### Obtener por UUID

`GET /fases/550e8400-e29b-41d4-a716-446655440001`

### Actualizar atributos comunes

`PATCH /fases/550e8400-e29b-41d4-a716-446655440001`

```json
{
  "estado": "EN_CURSO"
}
```

### Actualizar atributos de una fase de grupos

```json
{
  "equipos_por_grupo": 5
}
```

### Actualizar atributos de una fase final

```json
{
  "modalidad": "PARTIDO_UNICO"
}
```

Si se envían atributos propios del otro subtipo, el servicio responde con `400 Bad Request`. `tipo` tampoco se puede cambiar en una actualización.

### Eliminar

`DELETE /fases/550e8400-e29b-41d4-a716-446655440001`

## 12) Consideraciones de base de datos

La herencia STI agrega el discriminador `tipo` y las columnas de ambas subclases a la tabla `fases`. Asegúrate de generar y aplicar una migración que cree o actualice esa estructura antes de usar el CRUD. No dependas de `synchronize: true` en producción.

Los tipos de columna `uuid` y `enum` dependen del motor y driver configurados en TypeORM. Si el motor del proyecto no los soporta directamente, usa el tipo equivalente del driver y adapta la migración.

## 13) Resultado

La clase abstracta `Fase` concentra los atributos comunes. `FaseGrupos` y `FaseFinal` agregan sus propios atributos, DTOs y entidades concretas. El pipe valida el cuerpo según `tipo`, el mapper crea la subclase correcta y el service implementa el CRUD compartido sobre el repositorio de `Fase`. Todo queda expuesto mediante un único `POST /fases` y las rutas estándar de lectura, actualización y eliminación.
