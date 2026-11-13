import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { Partido } from '../partidos/entities/partido.entity';
import { BoletaResponseDto } from './dto/boleta-response.dto';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import { UpdateBoletaDto } from './dto/update-boleta.dto';
import { Boleta } from './entities/boleta.entity';
import { BoletaMapper } from './mappers/boleta.mapper';

const BOLETA_RELATIONS = {
  aficionado: true,
  partido: { escenario: true },
  localidad: { escenario: true },
} as const;

@Injectable()
export class BoletasService {
  constructor(
    @InjectRepository(Boleta)
    private readonly boletasRepository: Repository<Boleta>,
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Localidad)
    private readonly localidadesRepository: Repository<Localidad>,
  ) {}

  async create(dto: CreateBoletaDto): Promise<BoletaResponseDto> {
    const aficionado = await this.findAficionado(dto.aficionado_id);
    const partido = await this.findPartido(dto.partido_id);
    const localidad = await this.findLocalidad(dto.localidad_id);
    this.assertLocalidadDelEscenario(partido, localidad);
    const saved = await this.boletasRepository.save(
      BoletaMapper.toEntity(dto, aficionado, partido, localidad),
    );
    return BoletaMapper.toResponseDto(saved);
  }

  async findAll(): Promise<BoletaResponseDto[]> {
    const boletas = await this.boletasRepository.find({
      relations: BOLETA_RELATIONS,
    });
    return BoletaMapper.toResponseDtoList(boletas);
  }

  async findOne(id: string): Promise<BoletaResponseDto> {
    return BoletaMapper.toResponseDto(await this.findBoleta(id));
  }

  async update(id: string, dto: UpdateBoletaDto): Promise<BoletaResponseDto> {
    const boleta = await this.findBoleta(id);
    if (dto.aficionado_id !== undefined) {
      boleta.aficionado = await this.findAficionado(dto.aficionado_id);
    }
    if (dto.partido_id !== undefined) {
      boleta.partido = await this.findPartido(dto.partido_id);
    }
    if (dto.localidad_id !== undefined) {
      boleta.localidad = await this.findLocalidad(dto.localidad_id);
    }
    this.assertLocalidadDelEscenario(boleta.partido, boleta.localidad);
    const saved = await this.boletasRepository.save(
      BoletaMapper.mergeEntity(boleta, dto),
    );
    return BoletaMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const boleta = await this.findBoleta(id);
    await this.boletasRepository.remove(boleta);
    return { message: `Boleta #${id} deleted successfully` };
  }

  // La localidad de la boleta debe ser del escenario donde se juega el partido.
  private assertLocalidadDelEscenario(
    partido: Partido,
    localidad: Localidad,
  ): void {
    const escenarioPartido = partido.escenario?.id ?? partido.escenario_id;
    const escenarioLocalidad =
      localidad.escenario?.id ?? localidad.escenario_id;
    if (escenarioPartido !== escenarioLocalidad) {
      throw new BadRequestException(
        `Localidad ${localidad.id} does not belong to the escenario of partido ${partido.id}`,
      );
    }
  }

  private async findBoleta(id: string): Promise<Boleta> {
    const boleta = await this.boletasRepository.findOne({
      where: { id },
      relations: BOLETA_RELATIONS,
    });
    if (!boleta) {
      throw new NotFoundException(`Boleta with id ${id} not found`);
    }
    return boleta;
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

  private async findPartido(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id },
      relations: { escenario: true },
    });
    if (!partido) {
      throw new NotFoundException(`Partido with id ${id} not found`);
    }
    return partido;
  }

  private async findLocalidad(id: string): Promise<Localidad> {
    const localidad = await this.localidadesRepository.findOne({
      where: { id },
      relations: { escenario: true },
    });
    if (!localidad) {
      throw new NotFoundException(`Localidad with id ${id} not found`);
    }
    return localidad;
  }
}
