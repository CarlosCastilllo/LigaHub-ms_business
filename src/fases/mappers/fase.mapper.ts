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

  mergeEntity(entity: Fase, dto: UpdateFaseDto): Fase {
    if (dto.numero_orden !== undefined) entity.numero_orden = dto.numero_orden;
    if (dto.fecha_inicio !== undefined) entity.fecha_inicio = dto.fecha_inicio;
    if (dto.fecha_fin !== undefined) entity.fecha_fin = dto.fecha_fin;
    if (dto.estado !== undefined) entity.estado = dto.estado;
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
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };

    if (entity instanceof FaseGrupos) {
      if (entity.cantidad_grupos != null) {
        response.cantidad_grupos = entity.cantidad_grupos;
      }
      if (entity.equipos_por_grupo != null) {
        response.equipos_por_grupo = entity.equipos_por_grupo;
      }
    } else if (entity instanceof FaseFinal) {
      if (entity.numero_partidos != null) {
        response.numero_partidos = entity.numero_partidos;
      }
      if (entity.modalidad != null) {
        response.modalidad = entity.modalidad;
      }
    }

    return response;
  }

  toResponseDtoList(entities: Fase[]): FaseResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
