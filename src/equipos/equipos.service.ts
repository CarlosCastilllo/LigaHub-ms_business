import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Fase } from '../fases/entities/fase.entity';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { EquipoResponseDto } from './dto/equipo-response.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { Equipo } from './entities/equipo.entity';
import { EquipoMapper } from './mappers/equipo.mapper';

@Injectable()
export class EquiposService {
  constructor(
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
  ) {}

  async create(dto: CreateEquipoDto): Promise<EquipoResponseDto> {
    if (dto.fase_grupos_id) {
      await this.findFaseGrupos(dto.fase_grupos_id);
    }
    const saved = await this.equiposRepository.save(
      EquipoMapper.toEntity(dto),
    );
    return EquipoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EquipoResponseDto[]> {
    const equipos = await this.equiposRepository.find();
    return EquipoMapper.toResponseDtoList(equipos);
  }

  async findOne(id: string): Promise<EquipoResponseDto> {
    return EquipoMapper.toResponseDto(await this.findEquipo(id));
  }

  async update(
    id: string,
    dto: UpdateEquipoDto,
  ): Promise<EquipoResponseDto> {
    const equipo = await this.findEquipo(id);
    if (dto.fase_grupos_id !== undefined && dto.fase_grupos_id !== null) {
      await this.findFaseGrupos(dto.fase_grupos_id);
    }
    const saved = await this.equiposRepository.save(
      EquipoMapper.mergeEntity(equipo, dto),
    );
    return EquipoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const equipo = await this.equiposRepository.findOne({
      where: { id },
      relations: {
        jugadores_equipo: true,
        inscripciones: true,
        partidos_locales: true,
        partidos_visitantes: true,
        aficionados_equipo: true,
        equipos_deportes: true,
      },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    if (
      equipo.jugadores_equipo?.length ||
      equipo.inscripciones?.length ||
      equipo.partidos_locales?.length ||
      equipo.partidos_visitantes?.length ||
      equipo.aficionados_equipo?.length ||
      equipo.equipos_deportes?.length
    ) {
      throw new ConflictException(
        `Equipo #${id} has jugadores, inscripciones, partidos, aficionado preferences or deportes; delete or reassign them first`,
      );
    }
    await this.equiposRepository.remove(equipo);
    return { message: `Equipo #${id} deleted successfully` };
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({
      where: { id },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo with id ${id} not found`);
    }
    return equipo;
  }

  private async findFaseGrupos(id: string): Promise<FaseGrupos> {
    const fase = await this.fasesRepository.findOne({ where: { id } });
    if (!(fase instanceof FaseGrupos)) {
      throw new NotFoundException(`FaseGrupos with id ${id} not found`);
    }
    return fase;
  }
}
