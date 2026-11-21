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
import { FaseFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';
import { Equipo } from '../equipos/entities/equipo.entity';

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
    await this.assertNumeroOrdenDisponible(
      dto.torneo_id,
      dto.numero_orden,
    );
    const entity = this.faseMapper.toEntity(dto);
    entity.torneo = torneo;
    const saved = await this.fasesRepository.save(entity);
    return this.faseMapper.toResponseDto(saved);
  }

  async findAll(
    filtros: FindFasesQueryDto = {},
  ): Promise<FaseResponseDto[]> {
    const { tipo, torneo_id } = filtros;
    if (torneo_id) await this.findTorneo(torneo_id);

    if (!tipo && !torneo_id) {
      const fases = await this.fasesRepository.find({
        relations: { torneo: true },
      });
      return this.faseMapper.toResponseDtoList(fases);
    }

    const fases = await this.fasesRepository
      .createQueryBuilder('fase')
      .leftJoinAndSelect('fase.torneo', 'torneo')
      .where(
        tipo ? 'fase.tipo = :tipo' : '1 = 1',
        tipo ? { tipo } : {},
      )
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
      relations: { torneo: true },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    return this.faseMapper.toResponseDto(fase);
  }

  async update(id: string, dto: UpdateFaseDto): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { torneo: true },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }

    if (dto.torneo_id !== undefined) {
      fase.torneo = await this.findTorneo(dto.torneo_id);
    }

    const nuevoOrden =
      dto.numero_orden !== undefined
        ? dto.numero_orden
        : fase.numero_orden;
    const torneoId = dto.torneo_id ?? fase.torneo_id;
    await this.assertNumeroOrdenDisponible(
      torneoId,
      nuevoOrden,
      fase.id,
    );

    const hasGruposFields =
      dto.cantidad_grupos !== undefined || dto.equipos_por_grupo !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if (
      (fase instanceof FaseGrupos && hasFinalFields) ||
      (fase instanceof FaseFinal && hasGruposFields)
    ) {
      throw new BadRequestException(
        'Los datos enviados no corresponden al tipo de fase seleccionado',
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
      relations: { partidos: true, torneo: true },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    if (fase.partidos?.length) {
      throw new ConflictException(
        `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene partidos. Elimine o reasigne esos partidos primero`,
      );
    }
    if (fase instanceof FaseGrupos) {
      const equipos = await this.equiposRepository.find({
        where: { fase_grupos_id: id },
      });
      if (equipos.length) {
        throw new ConflictException(
          `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene equipos asignados. Reasigne esos equipos primero`,
        );
      }
    }

    await this.fasesRepository.remove(fase);
    return { message: `Se eliminó la fase número ${fase.numero_orden} correctamente` };
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    return torneo;
  }

  private async assertNumeroOrdenDisponible(
    torneoId: string,
    numeroOrden: number,
    faseIdActual?: string,
  ): Promise<void> {
    const existente = await this.fasesRepository.findOne({
      where: {
        torneo: { id: torneoId },
        numero_orden: numeroOrden,
      },
    });
    if (existente && existente.id !== faseIdActual) {
      throw new ConflictException(
        `El torneo ya tiene una fase en la posición ${numeroOrden}`,
      );
    }
  }

  private assertCreateSubtypeFields(dto: CreateFaseDto): void {
    const hasGruposFields =
      dto.cantidad_grupos !== undefined ||
      dto.equipos_por_grupo !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if (
      (dto.tipo === TipoFase.GRUPOS &&
        (dto.cantidad_grupos === undefined ||
          dto.equipos_por_grupo === undefined ||
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
