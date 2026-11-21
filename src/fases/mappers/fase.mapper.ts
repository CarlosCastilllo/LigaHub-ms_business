import { Injectable } from '@nestjs/common';
import { UpdateFaseDto } from '../dto/update-fase.dto';
import { FaseResponseDto } from '../dto/fase-response.dto';
import { FaseFinal } from '../entities/fase-final.entity';
import { FaseGrupos } from '../entities/fase-grupos.entity';
import { Fase, TipoFase } from '../entities/fase.entity';
import { CreateFaseDto } from '../dto/create-fase.dto';

@Injectable()
export class FaseMapper {
  // Crea la fase general junto con su detalle 1:1 segun el tipo recibido.
  toEntity(dto: CreateFaseDto): Fase {
    const fase = Object.assign(new Fase(), {
      numero_orden: dto.numero_orden,
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: dto.fecha_fin,
      estado: dto.estado,
    });
    switch (dto.tipo) {
      case TipoFase.GRUPOS:
        fase.grupos = Object.assign(new FaseGrupos(), {
          nombre: dto.nombre,
          cupo_equipos: dto.cupo_equipos ?? null,
        });
        return fase;
      case TipoFase.FINAL:
        fase.final = Object.assign(new FaseFinal(), {
          numero_partidos: dto.numero_partidos ?? null,
          modalidad: dto.modalidad ?? null,
        });
        return fase;
      default:
        throw new Error('Unsupported Fase type');
    }
  }

  // El tipo ya no se guarda: se deduce del detalle que tenga la fase.
  tipoDe(entity: Fase): TipoFase {
    if (entity.grupos) return TipoFase.GRUPOS;
    if (entity.final) return TipoFase.FINAL;
    throw new Error(
      `La fase ${entity.id} no tiene detalle de grupos ni de final`,
    );
  }

  mergeEntity(entity: Fase, dto: UpdateFaseDto): Fase {
    if (dto.numero_orden !== undefined) entity.numero_orden = dto.numero_orden;
    if (dto.fecha_inicio !== undefined) entity.fecha_inicio = dto.fecha_inicio;
    if (dto.fecha_fin !== undefined) entity.fecha_fin = dto.fecha_fin;
    if (dto.estado !== undefined) entity.estado = dto.estado;

    if (entity.grupos) {
      if (dto.nombre !== undefined) entity.grupos.nombre = dto.nombre;
      if (dto.cupo_equipos !== undefined) {
        entity.grupos.cupo_equipos = dto.cupo_equipos;
      }
    }

    if (entity.final) {
      if (dto.numero_partidos !== undefined) {
        entity.final.numero_partidos = dto.numero_partidos;
      }
      if (dto.modalidad !== undefined) entity.final.modalidad = dto.modalidad;
    }

    return entity;
  }

  toResponseDto(entity: Fase): FaseResponseDto {
    const response: FaseResponseDto = {
      id: entity.id,
      tipo: this.tipoDe(entity),
      numero_orden: entity.numero_orden,
      fecha_inicio: entity.fecha_inicio,
      fecha_fin: entity.fecha_fin,
      estado: entity.estado,
      torneo_id: entity.torneo?.id ?? entity.torneo_id,
    };

    if (entity.grupos) {
      response.fase_grupos_id = entity.grupos.id;
      response.nombre = entity.grupos.nombre;
      if (entity.grupos.cupo_equipos != null) {
        response.cupo_equipos = entity.grupos.cupo_equipos;
      }
    } else if (entity.final) {
      response.fase_final_id = entity.final.id;
      if (entity.final.numero_partidos != null) {
        response.numero_partidos = entity.final.numero_partidos;
      }
      if (entity.final.modalidad != null) {
        response.modalidad = entity.final.modalidad;
      }
    }

    return response;
  }

  toResponseDtoList(entities: Fase[]): FaseResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
