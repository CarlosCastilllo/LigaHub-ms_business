import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEscenarioDto } from './dto/create-escenario.dto';
import { EscenarioResponseDto } from './dto/escenario-response.dto';
import { UpdateEscenarioDto } from './dto/update-escenario.dto';
import { Escenario } from './entities/escenario.entity';
import { EscenarioMapper } from './mappers/escenario.mapper';

const ESCENARIO_RELATIONS = {
  escenario_padre: true,
  sub_escenarios: true,
  localidades: { boletas: true },
  partidos: true,
  escenarios_torneo: { torneo: true, escenario: true },
} as const;

@Injectable()
export class EscenariosService {
  constructor(
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
  ) {}

  async create(dto: CreateEscenarioDto): Promise<EscenarioResponseDto> {
    const escenarioPadre = dto.escenario_padre_id
      ? await this.findEscenarioSimple(dto.escenario_padre_id)
      : null;
    const saved = await this.escenariosRepository.save(
      EscenarioMapper.toEntity(dto, escenarioPadre),
    );
    return EscenarioMapper.toResponseDto(saved);
  }

  async findAll(): Promise<EscenarioResponseDto[]> {
    const escenarios = await this.escenariosRepository.find({
      relations: ESCENARIO_RELATIONS,
    });
    return EscenarioMapper.toResponseDtoList(escenarios);
  }

  async findOne(id: string): Promise<EscenarioResponseDto> {
    return EscenarioMapper.toResponseDto(await this.findEscenario(id));
  }

  async update(
    id: string,
    dto: UpdateEscenarioDto,
  ): Promise<EscenarioResponseDto> {
    const escenario = await this.findEscenario(id);
    if (dto.escenario_padre_id === null) {
      escenario.escenario_padre = null;
    } else if (dto.escenario_padre_id !== undefined) {
      escenario.escenario_padre = await this.findPadreSinCiclo(
        id,
        dto.escenario_padre_id,
      );
    }
    const saved = await this.escenariosRepository.save(
      EscenarioMapper.mergeEntity(escenario, dto),
    );
    return EscenarioMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const escenario = await this.findEscenario(id);
    // Las FKs de sub-escenarios, asignaciones y partidos usan ON DELETE
    // NO ACTION. Las localidades no bloquean: su FK es ON DELETE CASCADE.
    if (escenario.sub_escenarios?.length) {
      throw new ConflictException(
        `Escenario #${id} has sub-escenarios; reassign or delete them first`,
      );
    }
    if (escenario.escenarios_torneo?.length) {
      throw new ConflictException(
        `Escenario #${id} is assigned to tournaments; delete those assignments first`,
      );
    }
    if (escenario.partidos?.length) {
      throw new ConflictException(
        `Escenario #${id} has partidos; reassign or delete them first`,
      );
    }
    // Las localidades se borran en cascada, pero la FK de boletas hacia
    // localidades es NO ACTION y bloquearia ese borrado.
    if (escenario.localidades?.some((localidad) => localidad.boletas?.length)) {
      throw new ConflictException(
        `Escenario #${id} has localidades with boletas; delete those boletas first`,
      );
    }
    await this.escenariosRepository.remove(escenario);
    return { message: `Escenario #${id} deleted successfully` };
  }

  // Busca el padre propuesto y comprueba que no sea el propio escenario
  // ni uno de sus descendientes (lo que formaria un ciclo).
  private async findPadreSinCiclo(
    id: string,
    padreId: string,
  ): Promise<Escenario> {
    if (padreId === id) {
      throw new BadRequestException('An escenario cannot be its own parent');
    }
    const padre = await this.findEscenarioSimple(padreId);

    const visitados = new Set<string>([padre.id]);
    let ancestroId = padre.escenario_padre_id ?? null;
    while (ancestroId && !visitados.has(ancestroId)) {
      if (ancestroId === id) {
        throw new BadRequestException(
          `Escenario ${padreId} is a descendant of ${id}; this would create a cycle`,
        );
      }
      visitados.add(ancestroId);
      const ancestro = await this.escenariosRepository.findOne({
        where: { id: ancestroId },
      });
      ancestroId = ancestro?.escenario_padre_id ?? null;
    }
    return padre;
  }

  private async findEscenario(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
      relations: ESCENARIO_RELATIONS,
    });
    if (!escenario) {
      throw new NotFoundException(`Escenario with id ${id} not found`);
    }
    return escenario;
  }

  private async findEscenarioSimple(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
    });
    if (!escenario) {
      throw new NotFoundException(`Escenario with id ${id} not found`);
    }
    return escenario;
  }
}
