import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deporte } from '../deportes/entities/deporte.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { CreateEquipoDeporteDto } from './dto/create-equipo-deporte.dto';
import { EquipoDeporteResponseDto } from './dto/equipo-deporte-response.dto';
import { UpdateEquipoDeporteDto } from './dto/update-equipo-deporte.dto';
import { EquipoDeporte } from './entities/equipo-deporte.entity';
import { EquipoDeporteMapper } from './mappers/equipo-deporte.mapper';

@Injectable()
export class EquiposDeportesService {
  constructor(
    @InjectRepository(EquipoDeporte)
    private readonly relacionesRepository: Repository<EquipoDeporte>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Deporte)
    private readonly deportesRepository: Repository<Deporte>,
  ) {}

  async create(
    dto: CreateEquipoDeporteDto,
  ): Promise<EquipoDeporteResponseDto> {
    const equipo = await this.findEquipo(dto.equipo_id);
    const deporte = await this.findDeporte(dto.deporte_id);
    await this.assertAssociationDoesNotExist(dto.equipo_id, dto.deporte_id);
    const saved = await this.relacionesRepository.save(
      EquipoDeporteMapper.toEntity(equipo, deporte),
    );
    return EquipoDeporteMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EquipoDeporteResponseDto[]> {
    const relaciones = await this.relacionesRepository.find({
      relations: { equipo: true, deporte: true },
    });
    return EquipoDeporteMapper.toResponseDtoList(relaciones);
  }

  async findOne(id: string): Promise<EquipoDeporteResponseDto> {
    return EquipoDeporteMapper.toResponseDto(await this.findRelacion(id));
  }

  async update(
    id: string,
    dto: UpdateEquipoDeporteDto,
  ): Promise<EquipoDeporteResponseDto> {
    const relacion = await this.findRelacion(id);
    const equipoId = dto.equipo_id ?? relacion.equipo_id;
    const deporteId = dto.deporte_id ?? relacion.deporte_id;
    if (dto.equipo_id !== undefined || dto.deporte_id !== undefined) {
      await this.assertAssociationDoesNotExist(equipoId, deporteId, id);
    }
    if (dto.equipo_id !== undefined) {
      relacion.equipo = await this.findEquipo(dto.equipo_id);
    }
    if (dto.deporte_id !== undefined) {
      relacion.deporte = await this.findDeporte(dto.deporte_id);
    }
    const saved = await this.relacionesRepository.save(relacion);
    return EquipoDeporteMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.relacionesRepository.remove(relacion);
    return { message: `EquipoDeporte #${id} deleted successfully` };
  }

  private async findRelacion(id: string): Promise<EquipoDeporte> {
    const relacion = await this.relacionesRepository.findOne({
      where: { id },
      relations: { equipo: true, deporte: true },
    });
    if (!relacion) {
      throw new NotFoundException(`EquipoDeporte with id ${id} not found`);
    }
    return relacion;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    return equipo;
  }

  private async findDeporte(id: string): Promise<Deporte> {
    const deporte = await this.deportesRepository.findOne({ where: { id } });
    if (!deporte) {
      throw new NotFoundException(`Deporte with id ${id} not found`);
    }
    return deporte;
  }

  private async assertAssociationDoesNotExist(
    equipoId: string,
    deporteId: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.relacionesRepository.findOne({
      where: {
        equipo: { id: equipoId },
        deporte: { id: deporteId },
      },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('This deporte is already assigned to equipo');
    }
  }
}
