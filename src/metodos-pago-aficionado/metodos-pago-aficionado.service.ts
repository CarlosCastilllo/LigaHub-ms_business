import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { MetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { CreateMetodoPagoAficionadoDto } from './dto/create-metodo-pago-aficionado.dto';
import { MetodoPagoAficionadoResponseDto } from './dto/metodo-pago-aficionado-response.dto';
import { UpdateMetodoPagoAficionadoDto } from './dto/update-metodo-pago-aficionado.dto';
import { MetodoPagoAficionado } from './entities/metodo-pago-aficionado.entity';
import { MetodoPagoAficionadoMapper } from './mappers/metodo-pago-aficionado.mapper';

const MPA_RELATIONS = {
  aficionado: true,
  metodo_pago: true,
  apuestas: true,
} as const;

@Injectable()
export class MetodosPagoAficionadoService {
  constructor(
    @InjectRepository(MetodoPagoAficionado)
    private readonly mpaRepository: Repository<MetodoPagoAficionado>,
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(MetodoPago)
    private readonly metodosPagoRepository: Repository<MetodoPago>,
  ) {}

  async create(
    dto: CreateMetodoPagoAficionadoDto,
  ): Promise<MetodoPagoAficionadoResponseDto> {
    const aficionado = await this.findAficionado(dto.aficionado_id);
    const metodoPago = await this.findMetodoPagoActivo(dto.metodo_pago_id);
    if (dto.predeterminado) {
      await this.desmarcarPredeterminados(aficionado.id);
    }
    const saved = await this.mpaRepository.save(
      MetodoPagoAficionadoMapper.toEntity(dto, aficionado, metodoPago),
    );
    return MetodoPagoAficionadoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<MetodoPagoAficionadoResponseDto[]> {
    const registros = await this.mpaRepository.find({
      relations: MPA_RELATIONS,
    });
    return MetodoPagoAficionadoMapper.toResponseDtoList(registros);
  }

  async findOne(id: string): Promise<MetodoPagoAficionadoResponseDto> {
    return MetodoPagoAficionadoMapper.toResponseDto(await this.findMpa(id));
  }

  async update(
    id: string,
    dto: UpdateMetodoPagoAficionadoDto,
  ): Promise<MetodoPagoAficionadoResponseDto> {
    const registro = await this.findMpa(id);
    if (dto.predeterminado) {
      await this.desmarcarPredeterminados(
        registro.aficionado?.id ?? registro.aficionado_id,
        id,
      );
    }
    const saved = await this.mpaRepository.save(
      MetodoPagoAficionadoMapper.mergeEntity(registro, dto),
    );
    return MetodoPagoAficionadoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const registro = await this.findMpa(id);
    // La FK de apuestas hacia metodos_pago_aficionado usa NO ACTION.
    if (registro.apuestas?.length) {
      throw new ConflictException(
        `MetodoPagoAficionado #${id} has apuestas; set it INACTIVO instead`,
      );
    }
    await this.mpaRepository.remove(registro);
    return { message: `MetodoPagoAficionado #${id} deleted successfully` };
  }

  // Un aficionado solo puede tener un metodo de pago predeterminado.
  private async desmarcarPredeterminados(
    aficionadoId: string,
    exceptoId?: string,
  ): Promise<void> {
    const predeterminados = await this.mpaRepository.find({
      where: { aficionado: { id: aficionadoId }, predeterminado: true },
    });
    const otros = predeterminados.filter((item) => item.id !== exceptoId);
    if (!otros.length) return;
    for (const item of otros) item.predeterminado = false;
    await this.mpaRepository.save(otros);
  }

  private async findMpa(id: string): Promise<MetodoPagoAficionado> {
    const registro = await this.mpaRepository.findOne({
      where: { id },
      relations: MPA_RELATIONS,
    });
    if (!registro) {
      throw new NotFoundException(
        `MetodoPagoAficionado with id ${id} not found`,
      );
    }
    return registro;
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

  private async findMetodoPagoActivo(id: string): Promise<MetodoPago> {
    const metodo = await this.metodosPagoRepository.findOne({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`MetodoPago with id ${id} not found`);
    }
    if (!metodo.activo) {
      throw new BadRequestException(`MetodoPago ${id} is not active`);
    }
    return metodo;
  }
}
