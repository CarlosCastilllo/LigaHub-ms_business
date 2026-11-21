import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateFaseDto } from './dto/create-fase.dto';
import { FaseResponseDto } from './dto/fase-response.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';
import { Equipo } from '../equipos/entities/equipo.entity';

// Toda fase se lee junto con su detalle 1:1 para saber su tipo.
const FASE_RELATIONS = { torneo: true, grupos: true, final: true } as const;

@Injectable()
export class FasesService {
  constructor(
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly faseMapper: FaseMapper,
  ) {}

  async create(dto: CreateFaseDto): Promise<FaseResponseDto> {
    this.assertCreateSubtypeFields(dto);
    if (dto.fecha_fin < dto.fecha_inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }
    const torneo = await this.findTorneo(dto.torneo_id);
    const entity = this.faseMapper.toEntity(dto);
    entity.torneo = torneo;
    const saved = await this.fasesRepository.save(entity);
    return this.faseMapper.toResponseDto(saved);
  }

  async findAll(filtros: FindFasesQueryDto = {}): Promise<FaseResponseDto[]> {
    const { tipo, torneo_id } = filtros;
    if (torneo_id) await this.findTorneo(torneo_id);

    if (!tipo && !torneo_id) {
      const fases = await this.fasesRepository.find({
        relations: FASE_RELATIONS,
      });
      return this.faseMapper.toResponseDtoList(fases);
    }

    // Sin columna tipo: una fase es GRUPOS o FINAL segun que detalle exista.
    const filtroTipo =
      tipo === TipoFase.GRUPOS
        ? 'grupos.id IS NOT NULL'
        : tipo === TipoFase.FINAL
          ? 'final.id IS NOT NULL'
          : '1 = 1';
    const fases = await this.fasesRepository
      .createQueryBuilder('fase')
      .leftJoinAndSelect('fase.torneo', 'torneo')
      .leftJoinAndSelect('fase.grupos', 'grupos')
      .leftJoinAndSelect('fase.final', 'final')
      .where(filtroTipo)
      .andWhere(
        torneo_id ? 'torneo.id = :torneo_id' : '1 = 1',
        torneo_id ? { torneo_id } : {},
      )
      .getMany();
    return this.faseMapper.toResponseDtoList(fases);
  }

  async findOne(id: string): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    return this.faseMapper.toResponseDto(fase);
  }

  async update(id: string, dto: UpdateFaseDto): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }

    if (dto.torneo_id !== undefined) {
      fase.torneo = await this.findTorneo(dto.torneo_id);
    }

    const hasGruposFields =
      dto.nombre !== undefined || dto.cupo_equipos !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if ((fase.grupos && hasFinalFields) || (fase.final && hasGruposFields)) {
      throw new BadRequestException(
        'Los datos enviados no corresponden al tipo de fase seleccionado',
      );
    }

    if (fase.grupos && dto.cupo_equipos !== undefined) {
      await this.assertCupoNoMenorQueAsignados(
        fase.grupos.id,
        dto.cupo_equipos,
      );
    }

    const updated = this.faseMapper.mergeEntity(fase, dto);
    if (updated.fecha_fin < updated.fecha_inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }

    const saved = await this.fasesRepository.save(updated);
    return this.faseMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { partidos: true, ...FASE_RELATIONS },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    if (fase.partidos?.length) {
      throw new ConflictException(
        `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene partidos. Elimine o reasigne esos partidos primero`,
      );
    }
    if (fase.grupos) {
      // Los equipos apuntan al detalle fases_grupos, no a la fase general.
      const equipos = await this.equiposRepository.find({
        where: { fase_grupos_id: fase.grupos.id },
      });
      if (equipos.length) {
        throw new ConflictException(
          `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene equipos asignados. Reasigne esos equipos primero`,
        );
      }
    }

    // Las FKs de fases_grupos / fases_finales son ON DELETE CASCADE.
    await this.fasesRepository.remove(fase);
    return {
      message: `Se eliminó la fase número ${fase.numero_orden} correctamente`,
    };
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    return torneo;
  }

  // No se puede bajar el cupo por debajo de los equipos ya asignados.
  private async assertCupoNoMenorQueAsignados(
    grupoId: string,
    cupo: number,
  ): Promise<void> {
    const asignados = await this.equiposRepository.count({
      where: { fase_grupos_id: grupoId },
    });
    if (asignados > cupo) {
      throw new ConflictException(
        `El grupo ya tiene ${asignados} equipos asignados; el cupo no puede ser menor`,
      );
    }
  }

  private assertCreateSubtypeFields(dto: CreateFaseDto): void {
    const hasGruposFields =
      dto.nombre !== undefined || dto.cupo_equipos !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if (
      (dto.tipo === TipoFase.GRUPOS &&
        (dto.nombre === undefined ||
          dto.cupo_equipos === undefined ||
          hasFinalFields)) ||
      (dto.tipo === TipoFase.FINAL &&
        (dto.numero_partidos === undefined ||
          dto.modalidad === undefined ||
          hasGruposFields))
    ) {
      throw new BadRequestException(
        'Los datos enviados deben corresponder al tipo de fase seleccionado',
      );
    }
  }
}
