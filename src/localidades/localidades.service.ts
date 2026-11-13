import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { CreateLocalidadDto } from './dto/create-localidad.dto';
import { LocalidadResponseDto } from './dto/localidad-response.dto';
import { UpdateLocalidadDto } from './dto/update-localidad.dto';
import { Localidad } from './entities/localidad.entity';
import { LocalidadMapper } from './mappers/localidad.mapper';

const LOCALIDAD_RELATIONS = { escenario: true, boletas: true } as const;

@Injectable()
export class LocalidadesService {
  constructor(
    @InjectRepository(Localidad)
    private readonly localidadesRepository: Repository<Localidad>,
    @InjectRepository(Escenario)
    private readonly escenariosRepository: Repository<Escenario>,
  ) {}

  async create(dto: CreateLocalidadDto): Promise<LocalidadResponseDto> {
    const escenario = await this.findEscenario(dto.escenario_id);
    const saved = await this.localidadesRepository.save(
      LocalidadMapper.toEntity(dto, escenario),
    );
    return LocalidadMapper.toResponseDto(saved);
  }

  async findAll(): Promise<LocalidadResponseDto[]> {
    const localidades = await this.localidadesRepository.find({
      relations: LOCALIDAD_RELATIONS,
    });
    return LocalidadMapper.toResponseDtoList(localidades);
  }

  async findOne(id: string): Promise<LocalidadResponseDto> {
    return LocalidadMapper.toResponseDto(await this.findLocalidad(id));
  }

  async update(
    id: string,
    dto: UpdateLocalidadDto,
  ): Promise<LocalidadResponseDto> {
    const localidad = await this.findLocalidad(id);
    if (dto.escenario_id !== undefined) {
      localidad.escenario = await this.findEscenario(dto.escenario_id);
    }
    const saved = await this.localidadesRepository.save(
      LocalidadMapper.mergeEntity(localidad, dto),
    );
    return LocalidadMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const localidad = await this.findLocalidad(id);
    // La FK de boletas hacia localidades usa ON DELETE NO ACTION.
    if (localidad.boletas?.length) {
      throw new ConflictException(
        `Localidad #${id} has boletas; delete them first`,
      );
    }
    await this.localidadesRepository.remove(localidad);
    return { message: `Localidad #${id} deleted successfully` };
  }

  private async findLocalidad(id: string): Promise<Localidad> {
    const localidad = await this.localidadesRepository.findOne({
      where: { id },
      relations: LOCALIDAD_RELATIONS,
    });
    if (!localidad) {
      throw new NotFoundException(`Localidad with id ${id} not found`);
    }
    return localidad;
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
