import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partido } from '../partidos/entities/partido.entity';
import { CreatePelotaDto } from './dto/create-pelota.dto';
import { PelotaResponseDto } from './dto/pelota-response.dto';
import { UpdatePelotaDto } from './dto/update-pelota.dto';
import { Pelota } from './entities/pelota.entity';
import { PelotaMapper } from './mappers/pelota.mapper';

@Injectable()
export class PelotasService {
  constructor(
    @InjectRepository(Pelota)
    private readonly pelotasRepository: Repository<Pelota>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
  ) {}

  async create(dto: CreatePelotaDto): Promise<PelotaResponseDto> {
    const partido = dto.partido_id
      ? await this.findPartidoDisponible(dto.partido_id)
      : null;
    const saved = await this.pelotasRepository.save(
      PelotaMapper.toEntity(dto, partido),
    );
    return PelotaMapper.toResponseDto(saved);
  }

  async findAll(): Promise<PelotaResponseDto[]> {
    const pelotas = await this.pelotasRepository.find({
      relations: { partido: true },
    });
    return PelotaMapper.toResponseDtoList(pelotas);
  }

  async findOne(id: string): Promise<PelotaResponseDto> {
    return PelotaMapper.toResponseDto(await this.findPelota(id));
  }

  async update(id: string, dto: UpdatePelotaDto): Promise<PelotaResponseDto> {
    const pelota = await this.findPelota(id);
    if (dto.partido_id === null) {
      pelota.partido = null;
    } else if (dto.partido_id !== undefined) {
      pelota.partido = await this.findPartidoDisponible(dto.partido_id, id);
    }
    const saved = await this.pelotasRepository.save(
      PelotaMapper.mergeEntity(pelota, dto),
    );
    return PelotaMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const pelota = await this.findPelota(id);
    await this.pelotasRepository.remove(pelota);
    return { message: `Pelota #${id} deleted successfully` };
  }

  private async findPelota(id: string): Promise<Pelota> {
    const pelota = await this.pelotasRepository.findOne({
      where: { id },
      relations: { partido: true },
    });
    if (!pelota) {
      throw new NotFoundException(`Pelota with id ${id} not found`);
    }
    return pelota;
  }

  // Regla 1:1: el partido debe existir y no tener otra pelota asignada.
  // pelotaActualId evita marcar conflicto cuando ya es la pelota de ese partido.
  private async findPartidoDisponible(
    partidoId: string,
    pelotaActualId?: string,
  ): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id: partidoId },
      relations: { pelota: true },
    });
    if (!partido) {
      throw new NotFoundException(`Partido with id ${partidoId} not found`);
    }
    if (partido.pelota && partido.pelota.id !== pelotaActualId) {
      throw new ConflictException(
        `Partido with id ${partidoId} already has a pelota`,
      );
    }
    return partido;
  }
}
