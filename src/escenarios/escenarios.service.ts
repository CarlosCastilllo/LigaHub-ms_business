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
  // HU-GC-07: el marcador de cada partido se calcula con sus anotaciones.
  partidos: { anotaciones: true },
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
        `El escenario "${escenario.nombre}" tiene subescenarios asociados. Elimine o reasigne esos subescenarios primero`,
      );
    }
    if (escenario.escenarios_torneo?.length) {
      throw new ConflictException(
        `El escenario "${escenario.nombre}" está asignado a torneos. Elimine esas asignaciones primero`,
      );
    }
    if (escenario.partidos?.length) {
      throw new ConflictException(
        `El escenario "${escenario.nombre}" tiene partidos asociados. Reasigne o elimine esos partidos primero`,
      );
    }
    // Las localidades se borran en cascada, pero la FK de boletas hacia
    // localidades es NO ACTION y bloquearia ese borrado.
    if (escenario.localidades?.some((localidad) => localidad.boletas?.length)) {
      throw new ConflictException(
        `El escenario "${escenario.nombre}" tiene localidades con boletas. Elimine esas boletas primero`,
      );
    }
    await this.escenariosRepository.remove(escenario);
    return { message: `Se eliminó el escenario "${escenario.nombre}" correctamente` };
  }

  // Busca el padre propuesto y comprueba que no sea el propio escenario
  // ni uno de sus descendientes (lo que formaria un ciclo).
  private async findPadreSinCiclo(
    id: string,
    padreId: string,
  ): Promise<Escenario> {
    if (padreId === id) {
      throw new BadRequestException('Un escenario no puede ser su propio escenario padre');
    }
    const padre = await this.findEscenarioSimple(padreId);

    const visitados = new Set<string>([padre.id]);
    let ancestroId = padre.escenario_padre_id ?? null;
    while (ancestroId && !visitados.has(ancestroId)) {
      if (ancestroId === id) {
        throw new BadRequestException(
          `El escenario padre "${padre.nombre}" es descendiente del escenario seleccionado. Esta relación crearía un ciclo`,
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
      throw new NotFoundException('El escenario no fue encontrado');
    }
    return escenario;
  }

  private async findEscenarioSimple(id: string): Promise<Escenario> {
    const escenario = await this.escenariosRepository.findOne({
      where: { id },
    });
    if (!escenario) {
      throw new NotFoundException('El escenario no fue encontrado');
    }
    return escenario;
  }
}
