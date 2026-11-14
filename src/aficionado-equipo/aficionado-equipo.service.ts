import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { CreateAficionadoEquipoDto } from './dto/create-aficionado-equipo.dto';
import { AficionadoEquipoResponseDto } from './dto/aficionado-equipo-response.dto';
import { UpdateAficionadoEquipoDto } from './dto/update-aficionado-equipo.dto';
import { AficionadoEquipo } from './entities/aficionado-equipo.entity';
import { AficionadoEquipoMapper } from './mappers/aficionado-equipo.mapper';

@Injectable()
export class AficionadoEquipoService {
  constructor(
    @InjectRepository(AficionadoEquipo)
    private readonly relacionesRepository: Repository<AficionadoEquipo>,
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
  ) {}

  async create(
    dto: CreateAficionadoEquipoDto,
  ): Promise<AficionadoEquipoResponseDto> {
    const aficionado = await this.findAficionado(dto.aficionado_id);
    const equipo = await this.findEquipo(dto.equipo_id);
    await this.assertPreferenceDoesNotExist(dto.aficionado_id, dto.equipo_id);
    const saved = await this.relacionesRepository.save(
      AficionadoEquipoMapper.toEntity(dto, aficionado, equipo),
    );
    return AficionadoEquipoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<AficionadoEquipoResponseDto[]> {
    const relaciones = await this.relacionesRepository.find({
      relations: { aficionado: true, equipo: true },
    });
    return AficionadoEquipoMapper.toResponseDtoList(relaciones);
  }

  async findOne(id: string): Promise<AficionadoEquipoResponseDto> {
    return AficionadoEquipoMapper.toResponseDto(await this.findRelacion(id));
  }

  async update(
    id: string,
    dto: UpdateAficionadoEquipoDto,
  ): Promise<AficionadoEquipoResponseDto> {
    const relacion = await this.findRelacion(id);
    const aficionadoId = dto.aficionado_id ?? relacion.aficionado_id;
    const equipoId = dto.equipo_id ?? relacion.equipo_id;
    if (
      dto.aficionado_id !== undefined ||
      dto.equipo_id !== undefined
    ) {
      await this.assertPreferenceDoesNotExist(aficionadoId, equipoId, id);
    }
    if (dto.aficionado_id !== undefined) {
      relacion.aficionado = await this.findAficionado(dto.aficionado_id);
    }
    if (dto.equipo_id !== undefined) {
      relacion.equipo = await this.findEquipo(dto.equipo_id);
    }
    const saved = await this.relacionesRepository.save(relacion);
    return AficionadoEquipoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const relacion = await this.findRelacion(id);
    await this.relacionesRepository.remove(relacion);
    return { message: `AficionadoEquipo #${id} deleted successfully` };
  }

  private async findRelacion(id: string): Promise<AficionadoEquipo> {
    const relacion = await this.relacionesRepository.findOne({
      where: { id },
      relations: { aficionado: true, equipo: true },
    });
    if (!relacion) {
      throw new NotFoundException(
        `AficionadoEquipo with id ${id} not found`,
      );
    }
    return relacion;
  }

  private async findAficionado(id: string): Promise<Aficionado> {
    const aficionado = await this.aficionadosRepository.findOne({
      where: { id },
    });
    if (!aficionado) {
      throw new NotFoundException(`Aficionado with id ${id} not found`);
    }
    return aficionado;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    return equipo;
  }

  private async assertPreferenceDoesNotExist(
    aficionadoId: string,
    equipoId: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.relacionesRepository.findOne({
      where: {
        aficionado: { id: aficionadoId },
        equipo: { id: equipoId },
      },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException(
        'This aficionado already has this equipo as a preference',
      );
    }
  }
}
