import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { FaseResponseDto } from './dto/fase-response.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FaseFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import type { CreateFaseInput } from './pipes/create-fase-validation.pipe';

@Injectable()
export class FasesService {
  constructor(
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    private readonly faseMapper: FaseMapper,
  ) {}

  async create(dto: CreateFaseInput): Promise<FaseResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const entity = this.faseMapper.toEntity(dto);
    entity.torneo = torneo;
    const saved = await this.fasesRepository.save(entity);
    return this.faseMapper.toResponseDto(saved);
  }

  async findAll(tipo?: TipoFase): Promise<FaseResponseDto[]> {
    if (!tipo) {
      const fases = await this.fasesRepository.find({
        relations: { torneo: true },
      });
      return this.faseMapper.toResponseDtoList(fases);
    }

    // `tipo` es la columna discriminadora de la herencia: no es una propiedad
    // de la entidad, por eso se filtra con el query builder.
    const fases = await this.fasesRepository
      .createQueryBuilder('fase')
      .leftJoinAndSelect('fase.torneo', 'torneo')
      .where('fase.tipo = :tipo', { tipo })
      .getMany();
    return this.faseMapper.toResponseDtoList(fases);
  }

  async findOne(id: string): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { torneo: true },
    });
    if (!fase) {
      throw new NotFoundException(`Fase with id ${id} not found`);
    }
    return this.faseMapper.toResponseDto(fase);
  }

  async update(id: string, dto: UpdateFaseDto): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { torneo: true },
    });
    if (!fase) {
      throw new NotFoundException(`Fase with id ${id} not found`);
    }

    if (dto.torneo_id !== undefined) {
      fase.torneo = await this.findTorneo(dto.torneo_id);
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

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException(`Torneo with id ${id} not found`);
    }
    return torneo;
  }
}
