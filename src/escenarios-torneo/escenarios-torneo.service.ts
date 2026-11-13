import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateEscenarioTorneoDto } from './dto/create-escenario-torneo.dto';
import { EscenarioTorneoResponseDto } from './dto/escenario-torneo-response.dto';
import { TorneoEscenariosReportDto } from './dto/torneo-escenarios-report.dto';
import { UpdateEscenarioTorneoDto } from './dto/update-escenario-torneo.dto';
import { EscenarioTorneo } from './entities/escenario-torneo.entity';
import { EscenarioTorneoMapper } from './mappers/escenario-torneo.mapper';
import { EscenariosTorneoRepository } from './repositories/escenarios-torneo.repository';

@Injectable()
export class EscenariosTorneoService {
  constructor(
    @InjectRepository(EscenarioTorneo)
    private readonly escenariosTorneoRepository: Repository<EscenarioTorneo>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
    private readonly customEscenariosTorneoRepository: EscenariosTorneoRepository,
  ) {}

  async create(
    dto: CreateEscenarioTorneoDto,
  ): Promise<EscenarioTorneoResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const escenario = await this.findEscenario(dto.escenario_id);
    const entity = EscenarioTorneoMapper.toEntity(dto, torneo, escenario);
    const saved = await this.escenariosTorneoRepository.save(entity);
    return EscenarioTorneoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EscenarioTorneoResponseDto[]> {
    const asignaciones = await this.escenariosTorneoRepository.find({
      relations: { torneo: true, escenario: true },
    });
    return EscenarioTorneoMapper.toResponseDtoList(asignaciones);
  }

  async findOne(id: string): Promise<EscenarioTorneoResponseDto> {
    return EscenarioTorneoMapper.toResponseDto(await this.findAsignacion(id));
  }

  async update(
    id: string,
    dto: UpdateEscenarioTorneoDto,
  ): Promise<EscenarioTorneoResponseDto> {
    const asignacion = await this.findAsignacion(id);
    if (dto.torneo_id !== undefined) {
      asignacion.torneo = await this.findTorneo(dto.torneo_id);
    }
    if (dto.escenario_id !== undefined) {
      asignacion.escenario = await this.findEscenario(dto.escenario_id);
    }
    const saved = await this.escenariosTorneoRepository.save(
      EscenarioTorneoMapper.mergeEntity(asignacion, dto),
    );
    return EscenarioTorneoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const asignacion = await this.findAsignacion(id);
    await this.escenariosTorneoRepository.remove(asignacion);
    return { message: `EscenarioTorneo #${id} deleted successfully` };
  }

  async getCountByTorneo(
    torneoId: string,
  ): Promise<TorneoEscenariosReportDto> {
    await this.findTorneo(torneoId);
    return {
      torneo_id: torneoId,
      total_escenarios:
        await this.customEscenariosTorneoRepository.countByTorneo(torneoId),
    };
  }

  private async findAsignacion(id: string): Promise<EscenarioTorneo> {
    const asignacion = await this.escenariosTorneoRepository.findOne({
      where: { id },
      relations: { torneo: true, escenario: true },
    });
    if (!asignacion) {
      throw new NotFoundException(
        `EscenarioTorneo with id ${id} not found`,
      );
    }
    return asignacion;
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException(`Torneo with id ${id} not found`);
    }
    return torneo;
  }

  private async findEscenario(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
    });
    if (!escenario) {
      throw new NotFoundException(`Escenario with id ${id} not found`);
    }
    return escenario;
  }
}
