import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { CUOTAS_POR_PRONOSTICO } from '../apuestas/cuotas';
import { Localidad } from '../localidades/entities/localidad.entity';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { BoletaResponseDto } from './dto/boleta-response.dto';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import {
  PartidoDisponibleDto,
  toPartidoDisponible,
} from './dto/partido-disponible.dto';
import { UpdateBoletaDto } from './dto/update-boleta.dto';
import { Boleta, EstadoBoleta } from './entities/boleta.entity';
import { BoletaMapper } from './mappers/boleta.mapper';

const BOLETA_RELATIONS = {
  aficionado: true,
  partido: { escenario: true },
  localidad: { escenario: true },
} as const;

/** Relaciones para mostrar al aficionado sus boletas (HU-C). */
const MI_BOLETA_RELATIONS = {
  partido: { equipo_local: true, equipo_visitante: true, escenario: true },
  localidad: true,
} as const;

export interface CrearBoletaOpciones {
  /** Ruta del aficionado: solo se venden boletas de partidos programados. */
  soloPartidosProgramados?: boolean;
}

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

  async create(
    dto: CreateBoletaDto,
    opciones: CrearBoletaOpciones = {},
  ): Promise<BoletaResponseDto> {
    const aficionado = await this.findAficionado(dto.aficionado_id);
    const partido = await this.findPartido(dto.partido_id);
    if (
      opciones.soloPartidosProgramados &&
      partido.estado !== EstadoPartido.PROGRAMADO
    ) {
      throw new BadRequestException(
        'Solo se venden boletos para partidos programados',
      );
    }
    const localidad = await this.findLocalidad(dto.localidad_id);
    this.assertLocalidadDelEscenario(partido, localidad);
    const entity = BoletaMapper.toEntity(dto, aficionado, partido, localidad);
    // HU-C: el cupo se comprueba y la boleta se guarda en la misma
    // transaccion, con la localidad bloqueada, para no superar la capacidad.
    const saved =
      entity.estado === EstadoBoleta.ANULADA
        ? await this.boletasRepository.save(entity)
        : await this.boletasRepository.manager.transaction(async (manager) => {
            await this.assertCupo(manager, partido.id, localidad.id);
            return manager.save(entity);
          });
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

  /** Boletas del aficionado, con partido, escenario y localidad (HU-C). */
  findByAficionado(aficionadoId: string): Promise<Boleta[]> {
    return this.boletasRepository.find({
      where: { aficionado: { id: aficionadoId } },
      relations: MI_BOLETA_RELATIONS,
      order: { fecha_compra: 'DESC' },
    });
  }

  /** Boleta del aficionado indicado; 404 si no existe o es de otro. */
  async findOwned(id: string, aficionadoId: string): Promise<Boleta> {
    const boleta = await this.boletasRepository.findOne({
      where: { id, aficionado: { id: aficionadoId } },
      relations: MI_BOLETA_RELATIONS,
    });
    if (!boleta) {
      throw new NotFoundException('La boleta no fue encontrada');
    }
    return boleta;
  }

  /**
   * Partidos programados con las localidades de su escenario, el cupo
   * disponible de cada una y la tabla de cuotas (HU-C). No expone datos de
   * aficionados.
   */
  async partidosDisponibles(): Promise<PartidoDisponibleDto[]> {
    const partidos = await this.partidosRepository.find({
      where: { estado: EstadoPartido.PROGRAMADO },
      relations: {
        equipo_local: true,
        equipo_visitante: true,
        escenario: { localidades: true },
      },
      order: { fecha_hora: 'ASC' },
    });
    const vendidas = await this.contarVendidas(partidos.map((p) => p.id));
    return partidos.map((partido) =>
      toPartidoDisponible(partido, vendidas, CUOTAS_POR_PRONOSTICO),
    );
  }

  async update(id: string, dto: UpdateBoletaDto): Promise<BoletaResponseDto> {
    const boleta = await this.findBoleta(id);
    const partidoAnterior = boleta.partido?.id ?? boleta.partido_id;
    const localidadAnterior = boleta.localidad?.id ?? boleta.localidad_id;
    const estadoAnterior = boleta.estado;
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
    BoletaMapper.mergeEntity(boleta, dto);

    // Solo ocupa una plaza nueva si cambia de partido o de localidad, o si
    // se reactiva una boleta anulada; marcarla USADA no consume cupo.
    const ocupaPlazaNueva =
      boleta.estado !== EstadoBoleta.ANULADA &&
      (boleta.partido.id !== partidoAnterior ||
        boleta.localidad.id !== localidadAnterior ||
        estadoAnterior === EstadoBoleta.ANULADA);
    const saved = ocupaPlazaNueva
      ? await this.boletasRepository.manager.transaction(async (manager) => {
          await this.assertCupo(
            manager,
            boleta.partido.id,
            boleta.localidad.id,
            boleta.id,
          );
          return manager.save(boleta);
        })
      : await this.boletasRepository.save(boleta);
    return BoletaMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const boleta = await this.findBoleta(id);
    await this.boletasRepository.remove(boleta);
    return { message: 'La boleta se eliminó correctamente' };
  }

  // Bloquea la localidad y cuenta las boletas no anuladas del partido en
  // ella; si ya no queda cupo responde 409.
  private async assertCupo(
    manager: EntityManager,
    partidoId: string,
    localidadId: string,
    excluirBoletaId?: string,
  ): Promise<void> {
    const localidad = await manager.findOne(Localidad, {
      where: { id: localidadId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!localidad) {
      throw new NotFoundException('La localidad no fue encontrada');
    }
    const vendidas = await manager.count(Boleta, {
      where: {
        partido: { id: partidoId },
        localidad: { id: localidadId },
        estado: Not(EstadoBoleta.ANULADA),
        ...(excluirBoletaId ? { id: Not(excluirBoletaId) } : {}),
      },
    });
    if (vendidas >= localidad.capacidad) {
      throw new ConflictException(
        `La localidad "${localidad.nombre}" está agotada para este partido`,
      );
    }
  }

  // Boletas no anuladas agrupadas por partido y localidad, en una consulta.
  private async contarVendidas(
    partidoIds: string[],
  ): Promise<Map<string, number>> {
    const vendidas = new Map<string, number>();
    if (partidoIds.length === 0) return vendidas;
    const filas = await this.boletasRepository
      .createQueryBuilder('boleta')
      .select('boleta.partido_id', 'partido_id')
      .addSelect('boleta.localidad_id', 'localidad_id')
      .addSelect('COUNT(boleta.id)', 'vendidas')
      .where('boleta.estado <> :anulada', { anulada: EstadoBoleta.ANULADA })
      .andWhere('boleta.partido_id IN (:...partidoIds)', { partidoIds })
      .groupBy('boleta.partido_id')
      .addGroupBy('boleta.localidad_id')
      .getRawMany<{
        partido_id: string;
        localidad_id: string;
        vendidas: string;
      }>();
    for (const fila of filas) {
      vendidas.set(
        `${fila.partido_id}:${fila.localidad_id}`,
        Number(fila.vendidas),
      );
    }
    return vendidas;
  }

  // La localidad de la boleta debe ser del escenario donde se juega el partido.
  private assertLocalidadDelEscenario(
    partido: Partido,
    localidad: Localidad,
  ): void {
    const escenarioPartido = partido.escenario?.id ?? partido.escenario_id;
    if (!escenarioPartido) {
      throw new BadRequestException(
        'El partido aún no tiene escenario asignado; no se pueden vender boletas',
      );
    }
    const escenarioLocalidad =
      localidad.escenario?.id ?? localidad.escenario_id;
    if (escenarioPartido !== escenarioLocalidad) {
      throw new BadRequestException(
        `La localidad "${localidad.nombre}" no pertenece al escenario del partido seleccionado`,
      );
    }
  }

  private async findBoleta(id: string): Promise<Boleta> {
    const boleta = await this.boletasRepository.findOne({
      where: { id },
      relations: BOLETA_RELATIONS,
    });
    if (!boleta) {
      throw new NotFoundException('La boleta no fue encontrada');
    }
    return boleta;
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

  private async findPartido(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({
      where: { id },
      relations: { escenario: true },
    });
    if (!partido) {
      throw new NotFoundException('El partido no fue encontrado');
    }
    return partido;
  }

  private async findLocalidad(id: string): Promise<Localidad> {
    const localidad = await this.localidadesRepository.findOne({
      where: { id },
      relations: { escenario: true },
    });
    if (!localidad) {
      throw new NotFoundException('La localidad no fue encontrada');
    }
    return localidad;
  }
}
