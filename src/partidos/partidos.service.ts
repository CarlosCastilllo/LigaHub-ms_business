import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { EstadoFase, Fase } from '../fases/entities/fase.entity';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { PartidoResponseDto } from './dto/partido-response.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { FindPartidosQueryDto } from './dto/find-partidos-query.dto';
import { Partido } from './entities/partido.entity';
import { PartidoMapper } from './mappers/partido.mapper';

const PARTIDO_RELATIONS = {
  escenario: true,
  boletas: true,
  apuestas: true,
  anotaciones: true,
  pelota: true,
  equipo_local: true,
  equipo_visitante: true,
  // El detalle 1:1 permite saber si el partido es de grupos o de la fase final.
  fase: { grupos: true, final: true },
} as const;

@Injectable()
export class PartidosService {
  constructor(
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
  ) {}

  async create(dto: CreatePartidoDto): Promise<PartidoResponseDto> {
    this.assertEquiposDistintos(dto.equipo_local_id, dto.equipo_visitante_id);
    const equipoLocal = await this.findEquipo(dto.equipo_local_id);
    const equipoVisitante = await this.findEquipo(dto.equipo_visitante_id);
    const escenario = await this.findEscenario(dto.escenario_id);
    const fase = await this.findFase(dto.fase_id);
    await this.assertFaseFinalAdmitePartido(fase);
    const saved = await this.partidosRepository.save(
      PartidoMapper.toEntity(
        dto,
        escenario,
        equipoLocal,
        equipoVisitante,
        fase,
      ),
    );
    return PartidoMapper.toResponseDto(saved);
  }

  async findAll(
    filtros: FindPartidosQueryDto = {},
  ): Promise<PartidoResponseDto[]> {
    if (filtros.fase_id) {
      await this.findFase(filtros.fase_id);
      const partidos = await this.partidosRepository.find({
        where: { fase: { id: filtros.fase_id } },
        relations: PARTIDO_RELATIONS,
        order: { fecha_hora: 'ASC' },
      });
      return PartidoMapper.toResponseDtoList(partidos);
    }
    const partidos = await this.partidosRepository.find({
      relations: PARTIDO_RELATIONS,
    });
    return PartidoMapper.toResponseDtoList(partidos);
  }

  async findOne(id: string): Promise<PartidoResponseDto> {
    return PartidoMapper.toResponseDto(await this.findPartido(id));
  }

  async update(id: string, dto: UpdatePartidoDto): Promise<PartidoResponseDto> {
    const partido = await this.findPartido(id);
    // Se valida con los valores que quedarian despues de aplicar el PATCH.
    this.assertEquiposDistintos(
      dto.equipo_local_id ?? partido.equipo_local_id,
      dto.equipo_visitante_id ?? partido.equipo_visitante_id,
    );
    if (dto.equipo_local_id !== undefined) {
      partido.equipo_local = await this.findEquipo(dto.equipo_local_id);
    }
    if (dto.equipo_visitante_id !== undefined) {
      partido.equipo_visitante = await this.findEquipo(dto.equipo_visitante_id);
    }
    if (dto.escenario_id !== undefined) {
      partido.escenario = await this.findEscenario(dto.escenario_id);
    }
    if (dto.fase_id !== undefined && dto.fase_id !== partido.fase?.id) {
      const fase = await this.findFase(dto.fase_id);
      await this.assertFaseFinalAdmitePartido(fase);
      partido.fase = fase;
    }
    const saved = await this.partidosRepository.save(
      PartidoMapper.mergeEntity(partido, dto),
    );
    return PartidoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const partido = await this.findPartido(id);
    // Las FKs de boletas y apuestas usan ON DELETE NO ACTION.
    // Las anotaciones no bloquean: su FK es ON DELETE CASCADE.
    // La FK de la pelota (1:1) tambien es NO ACTION.
    if (partido.pelota) {
      throw new ConflictException(
        'El partido tiene una pelota asignada. Desasigne la pelota primero',
      );
    }
    if (partido.boletas?.length) {
      throw new ConflictException(
        'El partido tiene boletas asociadas. Elimine las boletas primero',
      );
    }
    if (partido.apuestas?.length) {
      throw new ConflictException(
        'El partido tiene apuestas asociadas. Elimine las apuestas primero',
      );
    }
    await this.partidosRepository.remove(partido);
    return { message: 'El partido se eliminó correctamente' };
  }

  private assertEquiposDistintos(localId: string, visitanteId: string): void {
    if (localId === visitanteId) {
      throw new BadRequestException(
        'equipo_local_id and equipo_visitante_id must be different',
      );
    }
  }

  private async findPartido(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id },
      relations: PARTIDO_RELATIONS,
    });
    if (!partido) {
      throw new NotFoundException('El partido no fue encontrado');
    }
    return partido;
  }

  private async findEscenario(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
    });
    if (!escenario) {
      throw new NotFoundException('El escenario no fue encontrado');
    }
    return escenario;
  }

  private async findEquipo(id: string): Promise<Equipo> {
    const equipo = await this.equiposRepository.findOne({ where: { id } });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    return equipo;
  }

  private async findFase(id: string): Promise<Fase> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { grupos: true, final: true },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    return fase;
  }

  // Reglas de la fase final: no recibe partidos si ya finalizó ni si ya
  // tiene todos los partidos que su configuración admite.
  private async assertFaseFinalAdmitePartido(fase: Fase): Promise<void> {
    if (!fase.final) return;
    if (fase.estado === EstadoFase.FINALIZADA) {
      throw new ConflictException(
        'La fase final ya finalizó y no admite nuevos partidos',
      );
    }
    const limite = fase.final.numero_partidos;
    if (limite == null) return;
    const actuales = await this.partidosRepository.count({
      where: { fase: { id: fase.id } },
    });
    if (actuales >= limite) {
      throw new ConflictException(
        `La fase final admite ${limite} ${limite === 1 ? 'partido' : 'partidos'} y ya los tiene todos registrados`,
      );
    }
  }
}
