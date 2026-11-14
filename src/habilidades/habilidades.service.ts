import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const saved = await this.habilidadesRepository.save(
      HabilidadMapper.toEntity(dto),
    );
    return HabilidadMapper.toResponseDto(saved);
  }

  async findAll(): Promise<HabilidadResponseDto[]> {
    const habilidades = await this.habilidadesRepository.find();
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
    const saved = await this.habilidadesRepository.save(
      HabilidadMapper.mergeEntity(habilidad, dto),
    );
    return HabilidadMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
      relations: { jugadores_habilidad: true },
    });
    if (!habilidad) {
      throw new NotFoundException(`Habilidad with id ${id} not found`);
    }
    if (habilidad.jugadores_habilidad?.length) {
      throw new ConflictException(
        `Habilidad #${id} is assigned to jugadores; delete its associations first`,
      );
    }
    await this.habilidadesRepository.remove(habilidad);
    return { message: `Habilidad #${id} deleted successfully` };
  }

  private async findHabilidad(id: string): Promise<Habilidad> {
    const habilidad = await this.habilidadesRepository.findOne({
      where: { id },
    });
    if (!habilidad) {
      throw new NotFoundException(`Habilidad with id ${id} not found`);
    }
    return habilidad;
  }
}
