import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscripcionResponseDto } from './dto/inscripcion-response.dto';
import { TorneoInscripcionesReportDto } from './dto/torneo-inscripciones-report.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionMapper } from './mappers/inscripcion.mapper';
import { InscripcionesRepository } from './repositories/inscripciones.repository';

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly customInscripcionesRepository: InscripcionesRepository,
  ) {}

  async create(dto: CreateInscripcionDto): Promise<InscripcionResponseDto> {
    const torneo = await this.findTorneo(dto.torneo_id);
    const equipo = await this.findEquipo(dto.equipo_id);
    const entity = InscripcionMapper.toEntity(dto, torneo, equipo);
    const saved = await this.inscripcionesRepository.save(entity);
    return InscripcionMapper.toResponseDto(saved);
  }

  async findAll(): Promise<InscripcionResponseDto[]> {
    const inscripciones = await this.inscripcionesRepository.find({
      relations: { torneo: true, equipo: true },
    });
    return InscripcionMapper.toResponseDtoList(inscripciones);
  }

  async findOne(id: string): Promise<InscripcionResponseDto> {
    return InscripcionMapper.toResponseDto(await this.findInscripcion(id));
  }

  async update(
    id: string,
    dto: UpdateInscripcionDto,
  ): Promise<InscripcionResponseDto> {
    const inscripcion = await this.findInscripcion(id);
    if (dto.torneo_id !== undefined) {
      inscripcion.torneo = await this.findTorneo(dto.torneo_id);
    }
    if (dto.equipo_id !== undefined) {
      inscripcion.equipo = await this.findEquipo(dto.equipo_id);
    }
    const saved = await this.inscripcionesRepository.save(
      InscripcionMapper.mergeEntity(inscripcion, dto),
    );
    return InscripcionMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const inscripcion = await this.findInscripcion(id);
    await this.inscripcionesRepository.remove(inscripcion);
    return { message: `Inscripcion #${id} deleted successfully` };
  }

  async getCountByTorneo(
    torneoId: string,
  ): Promise<TorneoInscripcionesReportDto> {
    await this.findTorneo(torneoId);
    return {
      torneo_id: torneoId,
      total_inscripciones:
        await this.customInscripcionesRepository.countByTorneo(torneoId),
    };
  }

  private async findInscripcion(id: string): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionesRepository.findOne({
      where: { id },
      relations: { torneo: true, equipo: true },
    });
    if (!inscripcion) {
      throw new NotFoundException(`Inscripcion with id ${id} not found`);
    }
    return inscripcion;
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException(`Torneo with id ${id} not found`);
    }
    return torneo;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    return equipo;
  }
}
