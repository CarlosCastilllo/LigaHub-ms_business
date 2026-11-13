import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { PartidoResponseDto } from './dto/partido-response.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { Partido } from './entities/partido.entity';
import { PartidoMapper } from './mappers/partido.mapper';

const PARTIDO_RELATIONS = {
  escenario: true,
  boletas: true,
  apuestas: true,
  anotaciones: true,
  pelota: true,
} as const;

@Injectable()
export class PartidosService {
  constructor(
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
  ) {}

  async create(dto: CreatePartidoDto): Promise<PartidoResponseDto> {
    this.assertEquiposDistintos(dto.equipo_local_id, dto.equipo_visitante_id);
    const escenario = await this.findEscenario(dto.escenario_id);
    const saved = await this.partidosRepository.save(
      PartidoMapper.toEntity(dto, escenario),
    );
    return PartidoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<PartidoResponseDto[]> {
    const partidos = await this.partidosRepository.find({
      relations: PARTIDO_RELATIONS,
    });
    return PartidoMapper.toResponseDtoList(partidos);
  }

  async findOne(id: string): Promise<PartidoResponseDto> {
    return PartidoMapper.toResponseDto(await this.findPartido(id));
  }

  async update(
    id: string,
    dto: UpdatePartidoDto,
  ): Promise<PartidoResponseDto> {
    const partido = await this.findPartido(id);
    // Se valida con los valores que quedarian despues de aplicar el PATCH.
    this.assertEquiposDistintos(
      dto.equipo_local_id ?? partido.equipo_local_id,
      dto.equipo_visitante_id ?? partido.equipo_visitante_id,
    );
    if (dto.escenario_id !== undefined) {
      partido.escenario = await this.findEscenario(dto.escenario_id);
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
        `Partido #${id} has a pelota assigned; unassign it first`,
      );
    }
    if (partido.boletas?.length) {
      throw new ConflictException(
        `Partido #${id} has boletas; delete them first`,
      );
    }
    if (partido.apuestas?.length) {
      throw new ConflictException(
        `Partido #${id} has apuestas; delete them first`,
      );
    }
    await this.partidosRepository.remove(partido);
    return { message: `Partido #${id} deleted successfully` };
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
      throw new NotFoundException(`Partido with id ${id} not found`);
    }
    return partido;
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
