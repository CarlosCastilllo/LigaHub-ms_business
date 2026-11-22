import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deporte } from '../deportes/entities/deporte.entity';
import { FaseResponseDto } from '../fases/dto/fase-response.dto';
import { Fase } from '../fases/entities/fase.entity';
import { FaseMapper } from '../fases/mappers/fase.mapper';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { TorneoResponseDto } from './dto/torneo-response.dto';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import { Torneo } from './entities/torneo.entity';
import { TorneoMapper } from './mappers/torneo.mapper';

@Injectable()
export class TorneosService {
  constructor(
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    @InjectRepository(Deporte)
    private readonly deportesRepository: Repository<Deporte>,
    private readonly torneoMapper: TorneoMapper,
    private readonly faseMapper: FaseMapper,
  ) {}

  async create(dto: CreateTorneoDto): Promise<TorneoResponseDto> {
    const deporte = await this.findDeporte(dto.deporte_id);
    const torneo = this.torneoMapper.toEntity(dto);
    torneo.deporte = deporte;
    const saved = await this.torneosRepository.save(torneo);
    return this.torneoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<TorneoResponseDto[]> {
    const torneos = await this.torneosRepository.find();
    return this.torneoMapper.toResponseDtoList(torneos);
  }

  async findOne(id: string): Promise<TorneoResponseDto> {
    const torneo = await this.findTorneo(id);
    return this.torneoMapper.toResponseDto(torneo);
  }

  async findFases(id: string): Promise<FaseResponseDto[]> {
    await this.findTorneo(id);
    const fases = await this.fasesRepository.find({
      where: { torneo: { id } },
      relations: { torneo: true, grupos: true, final: true },
      order: { numero_orden: 'ASC', fecha_inicio: 'ASC' },
    });
    return this.faseMapper.toResponseDtoList(fases);
  }

  async update(id: string, dto: UpdateTorneoDto): Promise<TorneoResponseDto> {
    const torneo = await this.findTorneo(id);
    if (dto.deporte_id !== undefined) {
      torneo.deporte = await this.findDeporte(dto.deporte_id);
    }
    const saved = await this.torneosRepository.save(
      this.torneoMapper.mergeEntity(torneo, dto),
    );
    return this.torneoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const torneo = await this.torneosRepository.findOne({
      where: { id },
      relations: {
        fases: { partidos: true },
        inscripciones: true,
        escenarios_torneo: true,
      },
    });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    if (
      torneo.fases?.length ||
      torneo.inscripciones?.length ||
      torneo.escenarios_torneo?.length
    ) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" tiene fases, partidos, inscripciones o escenarios. Elimine esas relaciones o desactívelo`,
      );
    }
    await this.torneosRepository.remove(torneo);
    return { message: `Se eliminó el torneo "${torneo.nombre}" correctamente` };
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    return torneo;
  }

  private async findDeporte(id: string): Promise<Deporte> {
    const deporte = await this.deportesRepository.findOne({ where: { id } });
    if (!deporte) {
      throw new NotFoundException('El deporte no fue encontrado');
    }
    return deporte;
  }
}
