import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const deportePadre =
      dto.deporte_padre_id != null
        ? await this.findDeporte(dto.deporte_padre_id)
        : null;
    const saved = await this.deportesRepository.save(
      DeporteMapper.toEntity(dto, deportePadre),
    );
    return DeporteMapper.toResponseDto(saved);
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
    if (dto.deporte_padre_id !== undefined) {
      if (dto.deporte_padre_id === null) {
        deporte.deporte_padre = null;
      } else {
        await this.assertNoCircularParent(id, dto.deporte_padre_id);
        deporte.deporte_padre = await this.findDeporte(dto.deporte_padre_id);
      }
    }
    const saved = await this.deportesRepository.save(
      DeporteMapper.mergeEntity(deporte, dto),
    );
    return DeporteMapper.toResponseDto(saved);
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
      throw new NotFoundException(`Deporte with id ${id} not found`);
    }
    if (
      deporte.torneos?.length ||
      deporte.equipos_deportes?.length ||
      deporte.deportes_hijos?.length
    ) {
      throw new ConflictException(
        `Deporte #${id} has torneos, equipos or child deportes; remove those relations first`,
      );
    }
    await this.deportesRepository.remove(deporte);
    return { message: `Deporte #${id} deleted successfully` };
  }

  private async findDeporte(id: string): Promise<Deporte> {
    const deporte = await this.deportesRepository.findOne({
      where: { id },
      relations: { deporte_padre: true },
    });
    if (!deporte) {
      throw new NotFoundException(`Deporte with id ${id} not found`);
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
          'A deporte cannot be its own ancestor',
        );
      }
      visited.add(currentId);
      const current = await this.findDeporte(currentId);
      currentId = current.deporte_padre?.id ?? null;
    }
  }
}
