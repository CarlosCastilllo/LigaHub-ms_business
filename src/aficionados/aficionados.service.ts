import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AficionadoResponseDto } from './dto/aficionado-response.dto';
import { CreateAficionadoDto } from './dto/create-aficionado.dto';
import { UpdateAficionadoDto } from './dto/update-aficionado.dto';
import { Aficionado } from './entities/aficionado.entity';
import { AficionadoMapper } from './mappers/aficionado.mapper';

const AFICIONADO_RELATIONS = {
  boletas: true,
  apuestas: true,
  metodos_pago_aficionado: true,
} as const;

@Injectable()
export class AficionadosService {
  constructor(
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
  ) {}

  async create(dto: CreateAficionadoDto): Promise<AficionadoResponseDto> {
    await this.assertDatosUnicos(dto.documento, dto.email);
    const saved = await this.aficionadosRepository.save(
      AficionadoMapper.toEntity(dto),
    );
    return AficionadoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<AficionadoResponseDto[]> {
    const aficionados = await this.aficionadosRepository.find({
      relations: AFICIONADO_RELATIONS,
    });
    return AficionadoMapper.toResponseDtoList(aficionados);
  }

  async findOne(id: string): Promise<AficionadoResponseDto> {
    return AficionadoMapper.toResponseDto(await this.findAficionado(id));
  }

  async update(
    id: string,
    dto: UpdateAficionadoDto,
  ): Promise<AficionadoResponseDto> {
    const aficionado = await this.findAficionado(id);
    await this.assertDatosUnicos(dto.documento, dto.email, id);
    const saved = await this.aficionadosRepository.save(
      AficionadoMapper.mergeEntity(aficionado, dto),
    );
    return AficionadoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const aficionado = await this.findAficionado(id);
    // Las FKs de boletas, apuestas y metodos de pago usan ON DELETE NO ACTION.
    if (aficionado.metodos_pago_aficionado?.length) {
      throw new ConflictException(
        `Aficionado #${id} has registered metodos de pago; delete them first`,
      );
    }
    if (aficionado.boletas?.length) {
      throw new ConflictException(
        `Aficionado #${id} has boletas; delete them first`,
      );
    }
    if (aficionado.apuestas?.length) {
      throw new ConflictException(
        `Aficionado #${id} has apuestas; delete them first`,
      );
    }
    await this.aficionadosRepository.remove(aficionado);
    return { message: `Aficionado #${id} deleted successfully` };
  }

  // documento y email son unicos: se responde 409 en lugar del error de MySQL.
  private async assertDatosUnicos(
    documento?: string,
    email?: string,
    idActual?: string,
  ): Promise<void> {
    if (documento !== undefined) {
      const existente = await this.aficionadosRepository.findOne({
        where: { documento },
      });
      if (existente && existente.id !== idActual) {
        throw new ConflictException(
          `An aficionado with documento ${documento} already exists`,
        );
      }
    }
    if (email !== undefined) {
      const existente = await this.aficionadosRepository.findOne({
        where: { email },
      });
      if (existente && existente.id !== idActual) {
        throw new ConflictException(
          `An aficionado with email ${email} already exists`,
        );
      }
    }
  }

  private async findAficionado(id: string): Promise<Aficionado> {
    const aficionado = await this.aficionadosRepository.findOne({
      where: { id },
      relations: AFICIONADO_RELATIONS,
    });
    if (!aficionado) {
      throw new NotFoundException(`Aficionado with id ${id} not found`);
    }
    return aficionado;
  }
}
