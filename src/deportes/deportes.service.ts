import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/database/is-duplicate-entry';
import { CreateDeporteDto } from './dto/create-deporte.dto';
import { DeporteResponseDto } from './dto/deporte-response.dto';
import { UpdateDeporteDto } from './dto/update-deporte.dto';
import { Deporte } from './entities/deporte.entity';
import { DeporteMapper } from './mappers/deporte.mapper';

@Injectable()
export class DeportesService {
  constructor(
    @InjectRepository(Deporte)
    private readonly deportesRepository: Repository<Deporte>,
  ) {}

  async create(dto: CreateDeporteDto): Promise<DeporteResponseDto> {
    await this.assertNombreDisponible(dto.nombre);
    const deportePadre =
      dto.deporte_padre_id != null
        ? await this.findDeporte(dto.deporte_padre_id)
        : null;
    return this.guardar(DeporteMapper.toEntity(dto, deportePadre));
  }

  async findAll(): Promise<DeporteResponseDto[]> {
    const deportes = await this.deportesRepository.find({
      relations: { deporte_padre: true },
    });
    return DeporteMapper.toResponseDtoList(deportes);
  }

  async findOne(id: string): Promise<DeporteResponseDto> {
    return DeporteMapper.toResponseDto(await this.findDeporte(id));
  }

  async update(
    id: string,
    dto: UpdateDeporteDto,
  ): Promise<DeporteResponseDto> {
    const deporte = await this.findDeporte(id);
    if (dto.nombre !== undefined) {
      await this.assertNombreDisponible(dto.nombre, id);
    }
    if (dto.deporte_padre_id !== undefined) {
      if (dto.deporte_padre_id === null) {
        deporte.deporte_padre = null;
      } else {
        await this.assertNoCircularParent(id, dto.deporte_padre_id);
        deporte.deporte_padre = await this.findDeporte(dto.deporte_padre_id);
      }
    }
    return this.guardar(DeporteMapper.mergeEntity(deporte, dto));
  }

  async remove(id: string): Promise<{ message: string }> {
    const deporte = await this.deportesRepository.findOne({
      where: { id },
      relations: {
        torneos: true,
        equipos_deportes: true,
        deportes_hijos: true,
      },
    });
    if (!deporte) {
      throw new NotFoundException('El deporte no fue encontrado');
    }
    if (
      deporte.torneos?.length ||
      deporte.equipos_deportes?.length ||
      deporte.deportes_hijos?.length
    ) {
      throw new ConflictException(
        `El deporte "${deporte.nombre}" tiene torneos, equipos o subdeportes asociados. Elimine esas relaciones primero`,
      );
    }
    await this.deportesRepository.remove(deporte);
    return { message: `Se eliminó el deporte "${deporte.nombre}" correctamente` };
  }

  private async guardar(deporte: Deporte): Promise<DeporteResponseDto> {
    try {
      const saved = await this.deportesRepository.save(deporte);
      return DeporteMapper.toResponseDto(saved);
    } catch (error) {
      // Dos solicitudes simultáneas pueden superar la comprobación previa.
      if (isDuplicateEntry(error)) {
        throw this.duplicado(deporte.nombre);
      }
      throw error;
    }
  }

  // La collation utf8mb4_unicode_ci de la columna ignora mayúsculas y tildes.
  private async assertNombreDisponible(
    nombre: string,
    currentId?: string,
  ): Promise<void> {
    const existente = await this.deportesRepository.findOne({
      where: { nombre },
    });
    if (existente && existente.id !== currentId) {
      throw this.duplicado(nombre);
    }
  }

  private duplicado(nombre: string): ConflictException {
    return new ConflictException(`Ya existe un deporte llamado "${nombre}"`);
  }

  private async findDeporte(id: string): Promise<Deporte> {
    const deporte = await this.deportesRepository.findOne({
      where: { id },
      relations: { deporte_padre: true },
    });
    if (!deporte) {
      throw new NotFoundException('El deporte no fue encontrado');
    }
    return deporte;
  }

  private async assertNoCircularParent(
    deporteId: string,
    deportePadreId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = deportePadreId;
    while (currentId) {
      if (currentId === deporteId || visited.has(currentId)) {
        throw new BadRequestException(
          'Un deporte no puede ser su propio deporte padre',
        );
      }
      visited.add(currentId);
      const current = await this.findDeporte(currentId);
      currentId = current.deporte_padre?.id ?? null;
    }
  }
}
