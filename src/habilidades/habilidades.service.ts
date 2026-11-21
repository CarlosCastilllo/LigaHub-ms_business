import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { isReferencedRow } from '../common/database/is-referenced-row';
import { CreateHabilidadDto } from './dto/create-habilidad.dto';
import { HabilidadResponseDto } from './dto/habilidad-response.dto';
import { UpdateHabilidadDto } from './dto/update-habilidad.dto';
import { Habilidad } from './entities/habilidad.entity';
import { HabilidadMapper } from './mappers/habilidad.mapper';

@Injectable()
export class HabilidadesService {
  constructor(
    @InjectRepository(Habilidad)
    private readonly habilidadesRepository: Repository<Habilidad>,
  ) {}

  async create(dto: CreateHabilidadDto): Promise<HabilidadResponseDto> {
    await this.assertNombreDisponible(dto.nombre);
    return this.guardar(HabilidadMapper.toEntity(dto));
  }

  async findAll(): Promise<HabilidadResponseDto[]> {
    const habilidades = await this.habilidadesRepository.find({
      order: { nombre: 'ASC' },
    });
    return HabilidadMapper.toResponseDtoList(habilidades);
  }

  async findOne(id: string): Promise<HabilidadResponseDto> {
    return HabilidadMapper.toResponseDto(await this.findHabilidad(id));
  }

  async update(
    id: string,
    dto: UpdateHabilidadDto,
  ): Promise<HabilidadResponseDto> {
    const habilidad = await this.findHabilidad(id);
    if (dto.nombre !== undefined) {
      await this.assertNombreDisponible(dto.nombre, id);
    }
    return this.guardar(HabilidadMapper.mergeEntity(habilidad, dto));
  }

  async remove(id: string): Promise<{ message: string }> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
      relations: { jugadores_habilidad: true },
    });
    if (!habilidad) {
      throw new NotFoundException('La habilidad no fue encontrada');
    }
    if (habilidad.jugadores_habilidad?.length) {
      throw this.asignada(habilidad.nombre);
    }
    try {
      await this.habilidadesRepository.remove(habilidad);
    } catch (error) {
      if (isReferencedRow(error)) {
        throw this.asignada(habilidad.nombre);
      }
      throw error;
    }
    return { message: `Se eliminó la habilidad "${habilidad.nombre}" correctamente` };
  }

  private async guardar(habilidad: Habilidad): Promise<HabilidadResponseDto> {
    try {
      const saved = await this.habilidadesRepository.save(habilidad);
      return HabilidadMapper.toResponseDto(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw this.duplicada(habilidad.nombre);
      }
      throw error;
    }
  }

  private async findHabilidad(id: string): Promise<Habilidad> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
    });
    if (!habilidad) {
      throw new NotFoundException('La habilidad no fue encontrada');
    }
    return habilidad;
  }

  private async assertNombreDisponible(
    nombre: string,
    currentId?: string,
  ): Promise<void> {
    const existente = await this.habilidadesRepository.findOne({
      where: { nombre },
    });
    if (existente && existente.id !== currentId) {
      throw this.duplicada(nombre);
    }
  }

  private duplicada(nombre: string): ConflictException {
    return new ConflictException(
      `Ya existe una habilidad llamada "${nombre}"`,
    );
  }

  private asignada(nombre: string): ConflictException {
    return new ConflictException(
      `La habilidad "${nombre}" está asignada a jugadores. Elimine esas asociaciones primero`,
    );
  }
}
