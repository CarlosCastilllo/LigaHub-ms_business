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

const MI_METODO_RELATIONS = {
  metodo_pago: true,
  apuestas: true,
} as const;

const MPA_RELATIONS = {
  aficionado: true,
  ...MI_METODO_RELATIONS,
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

  findByAficionado(aficionadoId: string): Promise<MetodoPagoAficionado[]> {
    return this.mpaRepository.find({
      where: { aficionado: { id: aficionadoId } },
      relations: MI_METODO_RELATIONS,
      order: { fecha_registro: 'DESC' },
    });
  }

  async findOwned(id: string, aficionadoId: string): Promise<MetodoPagoAficionado> {
    const registro = await this.mpaRepository.findOne({
      where: { id, aficionado: { id: aficionadoId } },
      relations: MI_METODO_RELATIONS,
    });
    if (!registro) {
      throw new NotFoundException('El método de pago no fue encontrado');
    }
    return registro;
  }

  async findCatalogoActivo(): Promise<Pick<MetodoPago, 'id' | 'nombre' | 'tipo'>[]> {
    const metodos = await this.metodosPagoRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    return metodos.map(({ id, nombre, tipo }) => ({ id, nombre, tipo }));
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
        `El método de pago registrado tiene apuestas asociadas. Cámbielo a INACTIVO en lugar de eliminarlo`,
      );
    }
    await this.mpaRepository.remove(registro);
    return { message: 'El método de pago del aficionado se eliminó correctamente' };
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
        'El método de pago del aficionado no fue encontrado',
      );
    }
    return registro;
  }

  private async findAficionado(id: string): Promise<Aficionado> {
    const aficionado = await this.aficionadosRepository.findOne({
      where: { id },
    });
    if (!aficionado) {
      throw new NotFoundException('El aficionado no fue encontrado');
    }
    return aficionado;
  }

  private async findMetodoPagoActivo(id: string): Promise<MetodoPago> {
    const metodo = await this.metodosPagoRepository.findOne({ where: { id } });
    if (!metodo) {
      throw new NotFoundException('El método de pago no fue encontrado');
    }
    if (!metodo.activo) {
      throw new BadRequestException(
        `El método de pago "${metodo.nombre}" no está activo`,
      );
    }
    return metodo;
  }
}
