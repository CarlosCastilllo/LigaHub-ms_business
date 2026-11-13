import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { MetodoPagoResponseDto } from './dto/metodo-pago-response.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';
import { MetodoPago } from './entities/metodo-pago.entity';
import { MetodoPagoMapper } from './mappers/metodo-pago.mapper';

const METODO_PAGO_RELATIONS = { metodos_pago_aficionado: true } as const;

@Injectable()
export class MetodosPagoService {
  constructor(
    @InjectRepository(MetodoPago)
    private readonly metodosPagoRepository: Repository<MetodoPago>,
  ) {}

  async create(dto: CreateMetodoPagoDto): Promise<MetodoPagoResponseDto> {
    await this.assertNombreUnico(dto.nombre);
    const saved = await this.metodosPagoRepository.save(
      MetodoPagoMapper.toEntity(dto),
    );
    return MetodoPagoMapper.toResponseDto(saved);
  }

  async findAll(): Promise<MetodoPagoResponseDto[]> {
    const metodos = await this.metodosPagoRepository.find({
      relations: METODO_PAGO_RELATIONS,
    });
    return MetodoPagoMapper.toResponseDtoList(metodos);
  }

  async findOne(id: string): Promise<MetodoPagoResponseDto> {
    return MetodoPagoMapper.toResponseDto(await this.findMetodoPago(id));
  }

  async update(
    id: string,
    dto: UpdateMetodoPagoDto,
  ): Promise<MetodoPagoResponseDto> {
    const metodo = await this.findMetodoPago(id);
    if (dto.nombre !== undefined) await this.assertNombreUnico(dto.nombre, id);
    const saved = await this.metodosPagoRepository.save(
      MetodoPagoMapper.mergeEntity(metodo, dto),
    );
    return MetodoPagoMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const metodo = await this.findMetodoPago(id);
    // La FK desde metodos_pago_aficionado usa ON DELETE NO ACTION.
    if (metodo.metodos_pago_aficionado?.length) {
      throw new ConflictException(
        `MetodoPago #${id} is registered by aficionados; deactivate it instead`,
      );
    }
    await this.metodosPagoRepository.remove(metodo);
    return { message: `MetodoPago #${id} deleted successfully` };
  }

  private async assertNombreUnico(
    nombre: string,
    idActual?: string,
  ): Promise<void> {
    const existente = await this.metodosPagoRepository.findOne({
      where: { nombre },
    });
    if (existente && existente.id !== idActual) {
      throw new ConflictException(
        `A metodo de pago named ${nombre} already exists`,
      );
    }
  }

  private async findMetodoPago(id: string): Promise<MetodoPago> {
    const metodo = await this.metodosPagoRepository.findOne({
      where: { id },
      relations: METODO_PAGO_RELATIONS,
    });
    if (!metodo) {
      throw new NotFoundException(`MetodoPago with id ${id} not found`);
    }
    return metodo;
  }
}
