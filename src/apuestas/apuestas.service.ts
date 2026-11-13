import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import {
  EstadoMetodoPagoAficionado,
  MetodoPagoAficionado,
} from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { ApuestaResponseDto } from './dto/apuesta-response.dto';
import { CreateApuestaDto } from './dto/create-apuesta.dto';
import { UpdateApuestaDto } from './dto/update-apuesta.dto';
import { Apuesta } from './entities/apuesta.entity';
import { ApuestaMapper } from './mappers/apuesta.mapper';

const APUESTA_RELATIONS = {
  aficionado: true,
  partido: true,
  metodo_pago_aficionado: { aficionado: true },
} as const;

@Injectable()
export class ApuestasService {
  constructor(
    @InjectRepository(Apuesta)
    private readonly apuestasRepository: Repository<Apuesta>,
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(MetodoPagoAficionado)
    private readonly mpaRepository: Repository<MetodoPagoAficionado>,
  ) {}

  async create(dto: CreateApuestaDto): Promise<ApuestaResponseDto> {
    const aficionado = await this.findAficionado(dto.aficionado_id);
    const partido = await this.findPartidoProgramado(dto.partido_id);
    const metodo = await this.findMetodoActivo(dto.metodo_pago_aficionado_id);
    this.assertMetodoDelAficionado(metodo, aficionado.id);
    const saved = await this.apuestasRepository.save(
      ApuestaMapper.toEntity(dto, aficionado, partido, metodo),
    );
    return ApuestaMapper.toResponseDto(saved);
  }

  async findAll(): Promise<ApuestaResponseDto[]> {
    const apuestas = await this.apuestasRepository.find({
      relations: APUESTA_RELATIONS,
    });
    return ApuestaMapper.toResponseDtoList(apuestas);
  }

  async findOne(id: string): Promise<ApuestaResponseDto> {
    return ApuestaMapper.toResponseDto(await this.findApuesta(id));
  }

  async update(
    id: string,
    dto: UpdateApuestaDto,
  ): Promise<ApuestaResponseDto> {
    const apuesta = await this.findApuesta(id);
    if (dto.aficionado_id !== undefined) {
      apuesta.aficionado = await this.findAficionado(dto.aficionado_id);
    }
    if (dto.partido_id !== undefined) {
      apuesta.partido = await this.findPartidoProgramado(dto.partido_id);
    }
    if (dto.metodo_pago_aficionado_id !== undefined) {
      apuesta.metodo_pago_aficionado = await this.findMetodoActivo(
        dto.metodo_pago_aficionado_id,
      );
    }
    // Se revalida con los valores resultantes si cambia el aficionado o el metodo.
    if (
      dto.aficionado_id !== undefined ||
      dto.metodo_pago_aficionado_id !== undefined
    ) {
      this.assertMetodoDelAficionado(
        apuesta.metodo_pago_aficionado,
        apuesta.aficionado?.id ?? apuesta.aficionado_id,
      );
    }
    const saved = await this.apuestasRepository.save(
      ApuestaMapper.mergeEntity(apuesta, dto),
    );
    return ApuestaMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const apuesta = await this.findApuesta(id);
    await this.apuestasRepository.remove(apuesta);
    return { message: `Apuesta #${id} deleted successfully` };
  }

  // El metodo de pago debe estar registrado por el mismo aficionado que apuesta.
  private assertMetodoDelAficionado(
    metodo: MetodoPagoAficionado,
    aficionadoId: string,
  ): void {
    const duenoId = metodo.aficionado?.id ?? metodo.aficionado_id;
    if (duenoId !== aficionadoId) {
      throw new BadRequestException(
        `MetodoPagoAficionado ${metodo.id} does not belong to aficionado ${aficionadoId}`,
      );
    }
  }

  private async findApuesta(id: string): Promise<Apuesta> {
    const apuesta = await this.apuestasRepository.findOne({
      where: { id },
      relations: APUESTA_RELATIONS,
    });
    if (!apuesta) {
      throw new NotFoundException(`Apuesta with id ${id} not found`);
    }
    return apuesta;
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

  // Solo se apuesta a partidos que aun no han empezado.
  private async findPartidoProgramado(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({ where: { id } });
    if (!partido) {
      throw new NotFoundException(`Partido with id ${id} not found`);
    }
    if (partido.estado !== EstadoPartido.PROGRAMADO) {
      throw new BadRequestException(
        `Partido ${id} is ${partido.estado}; bets are only allowed on PROGRAMADO partidos`,
      );
    }
    return partido;
  }

  private async findMetodoActivo(id: string): Promise<MetodoPagoAficionado> {
    const metodo = await this.mpaRepository.findOne({
      where: { id },
      relations: { aficionado: true },
    });
    if (!metodo) {
      throw new NotFoundException(
        `MetodoPagoAficionado with id ${id} not found`,
      );
    }
    if (metodo.estado !== EstadoMetodoPagoAficionado.ACTIVO) {
      throw new BadRequestException(
        `MetodoPagoAficionado ${id} is ${metodo.estado}`,
      );
    }
    return metodo;
  }
}
