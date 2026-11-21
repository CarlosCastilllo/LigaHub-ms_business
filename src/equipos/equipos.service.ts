import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import {
  EstadoInscripcion,
  Inscripcion,
} from '../inscripciones/entities/inscripcion.entity';
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
    @InjectRepository(FaseGrupos)
    private readonly fasesGruposRepository: Repository<FaseGrupos>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
  ) {}

  async create(dto: CreateEquipoDto): Promise<EquipoResponseDto> {
    if (dto.fase_grupos_id) {
      // Un equipo recien creado aun no tiene inscripciones: se rechazara.
      await this.assertPuedeEntrarAlGrupo(dto.fase_grupos_id);
    }
    const saved = await this.equiposRepository.save(EquipoMapper.toEntity(dto));
    return EquipoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EquipoResponseDto[]> {
    const equipos = await this.equiposRepository.find();
    return EquipoMapper.toResponseDtoList(equipos);
  }

  async findOne(id: string): Promise<EquipoResponseDto> {
    return EquipoMapper.toResponseDto(await this.findEquipo(id));
  }

  async update(id: string, dto: UpdateEquipoDto): Promise<EquipoResponseDto> {
    const equipo = await this.findEquipo(id);
    if (
      dto.fase_grupos_id !== undefined &&
      dto.fase_grupos_id !== null &&
      dto.fase_grupos_id !== equipo.fase_grupos_id
    ) {
      await this.assertPuedeEntrarAlGrupo(dto.fase_grupos_id, equipo.id);
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
      throw new NotFoundException('El equipo no fue encontrado');
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
        `El equipo "${equipo.nombre}" tiene jugadores, inscripciones, partidos, aficionados o deportes asociados. Elimine o reasigne esas relaciones o desactívelo`,
      );
    }
    await this.equiposRepository.remove(equipo);
    return { message: `Se eliminó el equipo "${equipo.nombre}" correctamente` };
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({
      where: { id },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    return equipo;
  }

  // fase_grupos_id es el id del grupo en fases_grupos. Para entrar, el equipo
  // debe tener una inscripcion ACEPTADA en el torneo del grupo y debe haber cupo.
  private async assertPuedeEntrarAlGrupo(
    grupoId: string,
    equipoId?: string,
  ): Promise<void> {
    const grupo = await this.fasesGruposRepository.findOne({
      where: { id: grupoId },
      relations: { fase: { torneo: true } },
    });
    if (!grupo) {
      throw new NotFoundException('El grupo no fue encontrado');
    }

    const torneoId = grupo.fase.torneo.id;
    const inscripcion = equipoId
      ? await this.inscripcionesRepository.findOne({
          where: {
            equipo: { id: equipoId },
            torneo: { id: torneoId },
            estado: EstadoInscripcion.ACEPTADA,
          },
        })
      : null;
    if (!inscripcion) {
      throw new ConflictException(
        `El equipo no tiene una inscripción aceptada en el torneo "${grupo.fase.torneo.nombre}"`,
      );
    }

    if (grupo.cupo_equipos != null) {
      const asignados = await this.equiposRepository.count({
        where: { fase_grupos_id: grupoId },
      });
      if (asignados >= grupo.cupo_equipos) {
        throw new ConflictException(
          `El grupo "${grupo.nombre}" ya completó su cupo de ${grupo.cupo_equipos} equipos`,
        );
      }
    }
  }
}
