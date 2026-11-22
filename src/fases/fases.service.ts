import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { CreateFaseDto } from './dto/create-fase.dto';
import { FaseResponseDto } from './dto/fase-response.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { EstadoFase, Fase, TipoFase } from './entities/fase.entity';
import { FaseMapper } from './mappers/fase.mapper';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';
import { Equipo } from '../equipos/entities/equipo.entity';
import { EquipoResponseDto } from '../equipos/dto/equipo-response.dto';
import { EquipoMapper } from '../equipos/mappers/equipo.mapper';
import {
  EstadoInscripcion,
  Inscripcion,
} from '../inscripciones/entities/inscripcion.entity';
import { AsignarEquiposGrupoDto } from './dto/asignar-equipos-grupo.dto';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { PartidoResponseDto } from '../partidos/dto/partido-response.dto';
import { PartidoMapper } from '../partidos/mappers/partido.mapper';

// Toda fase se lee junto con su detalle 1:1 para saber su tipo.
const FASE_RELATIONS = { torneo: true, grupos: true, final: true } as const;
// Las fases se devuelven en el orden en que se desarrollan.
const FASE_ORDER = { numero_orden: 'ASC', fecha_inicio: 'ASC' } as const;

@Injectable()
export class FasesService {
  constructor(
    @InjectRepository(Fase)
    private readonly fasesRepository: Repository<Fase>,
    @InjectRepository(Torneo)
    private readonly torneosRepository: Repository<Torneo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepository: Repository<Inscripcion>,
    private readonly faseMapper: FaseMapper,
  ) {}

  async create(dto: CreateFaseDto): Promise<FaseResponseDto> {
    this.assertCreateSubtypeFields(dto);
    if (dto.fecha_fin < dto.fecha_inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }
    const torneo = await this.findTorneo(dto.torneo_id);
    if (dto.tipo === TipoFase.GRUPOS && dto.nombre !== undefined) {
      await this.assertNombreGrupoDisponible(
        dto.torneo_id,
        dto.numero_orden,
        dto.nombre,
      );
    }
    const entity = this.faseMapper.toEntity(dto);
    entity.torneo = torneo;
    const saved = await this.fasesRepository.save(entity);
    return this.faseMapper.toResponseDto(saved);
  }

  async findAll(filtros: FindFasesQueryDto = {}): Promise<FaseResponseDto[]> {
    const { tipo, torneo_id, numero_orden } = filtros;
    if (torneo_id) await this.findTorneo(torneo_id);

    if (!tipo && !torneo_id && numero_orden === undefined) {
      const fases = await this.fasesRepository.find({
        relations: FASE_RELATIONS,
        order: FASE_ORDER,
      });
      return this.faseMapper.toResponseDtoList(fases);
    }

    // Sin columna tipo: una fase es GRUPOS o FINAL segun que detalle exista.
    const filtroTipo =
      tipo === TipoFase.GRUPOS
        ? 'grupos.id IS NOT NULL'
        : tipo === TipoFase.FINAL
          ? 'final.id IS NOT NULL'
          : '1 = 1';
    const fases = await this.fasesRepository
      .createQueryBuilder('fase')
      .leftJoinAndSelect('fase.torneo', 'torneo')
      .leftJoinAndSelect('fase.grupos', 'grupos')
      .leftJoinAndSelect('fase.final', 'final')
      .where(filtroTipo)
      .andWhere(
        torneo_id ? 'torneo.id = :torneo_id' : '1 = 1',
        torneo_id ? { torneo_id } : {},
      )
      .andWhere(
        numero_orden !== undefined
          ? 'fase.numero_orden = :numero_orden'
          : '1 = 1',
        numero_orden !== undefined ? { numero_orden } : {},
      )
      .orderBy('fase.numero_orden', 'ASC')
      .addOrderBy('fase.fecha_inicio', 'ASC')
      .getMany();
    return this.faseMapper.toResponseDtoList(fases);
  }

  async findOne(id: string): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    return this.faseMapper.toResponseDto(fase);
  }

  async update(id: string, dto: UpdateFaseDto): Promise<FaseResponseDto> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }

    const torneoActualId = fase.torneo?.id ?? fase.torneo_id;
    if (dto.torneo_id !== undefined && dto.torneo_id !== torneoActualId) {
      await this.assertSinDatosAsociados(fase);
      fase.torneo = await this.findTorneo(dto.torneo_id);
    }

    const hasGruposFields =
      dto.nombre !== undefined || dto.cupo_equipos !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if ((fase.grupos && hasFinalFields) || (fase.final && hasGruposFields)) {
      throw new BadRequestException(
        'Los datos enviados no corresponden al tipo de fase seleccionado',
      );
    }

    if (fase.final) {
      await this.assertFaseFinalEditable(fase, dto);
    }

    if (fase.grupos && dto.cupo_equipos !== undefined) {
      await this.assertCupoNoMenorQueAsignados(
        fase.grupos.id,
        dto.cupo_equipos,
      );
    }

    if (
      fase.grupos &&
      (dto.nombre !== undefined ||
        dto.numero_orden !== undefined ||
        dto.torneo_id !== undefined)
    ) {
      await this.assertNombreGrupoDisponible(
        fase.torneo?.id ?? fase.torneo_id,
        dto.numero_orden ?? fase.numero_orden,
        dto.nombre ?? fase.grupos.nombre,
        fase.id,
      );
    }

    const updated = this.faseMapper.mergeEntity(fase, dto);
    if (updated.fecha_fin < updated.fecha_inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }

    const saved = await this.fasesRepository.save(updated);
    return this.faseMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: { partidos: true, ...FASE_RELATIONS },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    if (fase.partidos?.length) {
      throw new ConflictException(
        `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene partidos. Elimine o reasigne esos partidos primero`,
      );
    }
    if (fase.final && fase.estado !== EstadoFase.PENDIENTE) {
      throw new ConflictException(
        `La fase final número ${fase.numero_orden} ya está en curso o finalizada. Solo se pueden eliminar fases finales pendientes`,
      );
    }
    if (fase.grupos && fase.estado !== EstadoFase.PENDIENTE) {
      throw new ConflictException(
        `El grupo "${fase.grupos.nombre}" ya está en curso o finalizado. Solo se pueden eliminar grupos pendientes`,
      );
    }
    if (fase.grupos) {
      // Los equipos apuntan al detalle fases_grupos, no a la fase general.
      const equipos = await this.equiposRepository.find({
        where: { fase_grupos_id: fase.grupos.id },
      });
      if (equipos.length) {
        throw new ConflictException(
          `La fase número ${fase.numero_orden} del torneo "${fase.torneo?.nombre ?? 'seleccionado'}" tiene equipos asignados. Reasigne esos equipos primero`,
        );
      }
    }

    // Las FKs de fases_grupos / fases_finales son ON DELETE CASCADE.
    await this.fasesRepository.remove(fase);
    return {
      message: `Se eliminó la fase número ${fase.numero_orden} correctamente`,
    };
  }

  // Partidos que pertenecen a una fase (de grupos o final).
  async findPartidos(id: string): Promise<PartidoResponseDto[]> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: {
        ...FASE_RELATIONS,
        partidos: {
          equipo_local: true,
          equipo_visitante: true,
          escenario: true,
          // HU-GC-07: el marcador se calcula a partir de las anotaciones.
          anotaciones: true,
        },
      },
    });
    if (!fase) {
      throw new NotFoundException('La fase no fue encontrada');
    }
    const partidos = [...(fase.partidos ?? [])].sort(
      (a, b) =>
        new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
    );
    // Se reasigna la fase para que la respuesta indique su tipo (GRUPOS/FINAL).
    return PartidoMapper.toResponseDtoList(
      partidos.map((partido) => Object.assign(partido, { fase })),
    );
  }

  // Equipos que conforman un grupo (fase de tipo GRUPOS).
  async findEquiposGrupo(id: string): Promise<EquipoResponseDto[]> {
    const grupo = await this.findGrupo(id);
    const equipos = await this.equiposRepository.find({
      where: { fase_grupos_id: grupo.id },
      order: { nombre: 'ASC' },
    });
    return EquipoMapper.toResponseDtoList(equipos);
  }

  // Asigna varios equipos a la vez. Un equipo que ya esta en otro grupo debe
  // salir de el primero (equipos.fase_grupos_id guarda un solo grupo).
  async asignarEquiposGrupo(
    id: string,
    dto: AsignarEquiposGrupoDto,
  ): Promise<EquipoResponseDto[]> {
    const fase = await this.findFaseGrupos(id);
    const grupo = fase.grupos as FaseGrupos;
    const torneo = fase.torneo;
    const ids = [...new Set(dto.equipo_ids)];

    const equipos = await this.equiposRepository.find({
      where: { id: In(ids) },
      relations: { fase_grupos: true },
    });
    if (equipos.length !== ids.length) {
      throw new NotFoundException(
        'Alguno de los equipos seleccionados no fue encontrado',
      );
    }

    for (const equipo of equipos) {
      if (equipo.fase_grupos_id === grupo.id) {
        throw new ConflictException(
          `El equipo "${equipo.nombre}" ya pertenece al grupo "${grupo.nombre}"`,
        );
      }
      if (equipo.fase_grupos_id) {
        throw new ConflictException(
          `El equipo "${equipo.nombre}" ya está asignado al grupo "${equipo.fase_grupos?.nombre ?? 'actual'}". Debe salir de ese grupo antes de entrar a otro`,
        );
      }
      if (!equipo.activo) {
        throw new ConflictException(
          `El equipo "${equipo.nombre}" está inactivo y no puede asignarse a un grupo`,
        );
      }
    }

    const inscripciones = await this.inscripcionesRepository.find({
      where: {
        equipo: { id: In(ids) },
        torneo: { id: torneo.id },
        estado: EstadoInscripcion.ACEPTADA,
      },
      relations: { equipo: true },
    });
    const inscritos = new Set(inscripciones.map(({ equipo }) => equipo.id));
    const sinInscripcion = equipos.find(({ id }) => !inscritos.has(id));
    if (sinInscripcion) {
      throw new ConflictException(
        `El equipo "${sinInscripcion.nombre}" no tiene una inscripción aceptada en el torneo "${torneo.nombre}"`,
      );
    }

    if (grupo.cupo_equipos != null) {
      const asignados = await this.equiposRepository.count({
        where: { fase_grupos_id: grupo.id },
      });
      if (asignados + equipos.length > grupo.cupo_equipos) {
        const disponibles = Math.max(grupo.cupo_equipos - asignados, 0);
        throw new ConflictException(
          `El grupo "${grupo.nombre}" admite ${grupo.cupo_equipos} equipos y solo le quedan ${disponibles} cupos disponibles`,
        );
      }
    }

    // save() con varias entidades se ejecuta en una sola transaccion.
    await this.equiposRepository.save(
      equipos.map((equipo) =>
        Object.assign(equipo, { fase_grupos_id: grupo.id, fase_grupos: grupo }),
      ),
    );
    return this.findEquiposGrupo(id);
  }

  // Saca un equipo del grupo; el equipo sigue registrado en la plataforma.
  async quitarEquipoGrupo(
    id: string,
    equipoId: string,
  ): Promise<{ message: string }> {
    const grupo = await this.findGrupo(id);
    const equipo = await this.equiposRepository.findOne({
      where: { id: equipoId },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo no fue encontrado');
    }
    if (equipo.fase_grupos_id !== grupo.id) {
      throw new ConflictException(
        `El equipo "${equipo.nombre}" no pertenece al grupo "${grupo.nombre}"`,
      );
    }
    await this.equiposRepository.save(
      Object.assign(equipo, { fase_grupos_id: null, fase_grupos: null }),
    );
    return {
      message: `El equipo "${equipo.nombre}" salió del grupo "${grupo.nombre}"`,
    };
  }

  private async findFaseGrupos(id: string): Promise<Fase> {
    const fase = await this.fasesRepository.findOne({
      where: { id },
      relations: FASE_RELATIONS,
    });
    if (!fase) {
      throw new NotFoundException('El grupo no fue encontrado');
    }
    if (!fase.grupos) {
      throw new BadRequestException(
        'La fase seleccionada no es una fase de grupos',
      );
    }
    return fase;
  }

  private async findGrupo(id: string): Promise<FaseGrupos> {
    return (await this.findFaseGrupos(id)).grupos as FaseGrupos;
  }

  // Dentro de una misma etapa (torneo + numero_orden) no se repite el nombre.
  private async assertNombreGrupoDisponible(
    torneoId: string,
    numeroOrden: number,
    nombre: string,
    excluirFaseId?: string,
  ): Promise<void> {
    const existente = await this.fasesRepository.findOne({
      where: {
        torneo: { id: torneoId },
        numero_orden: numeroOrden,
        grupos: { nombre: nombre.trim() },
      },
      relations: { grupos: true },
    });
    if (
      existente &&
      existente.id !== excluirFaseId &&
      existente.grupos?.nombre.trim().toLowerCase() ===
        nombre.trim().toLowerCase()
    ) {
      throw new ConflictException(
        `Ya existe un grupo llamado "${nombre.trim()}" en la fase ${numeroOrden} de este torneo`,
      );
    }
  }

  private async findTorneo(id: string): Promise<Torneo> {
    const torneo = await this.torneosRepository.findOne({ where: { id } });
    if (!torneo) {
      throw new NotFoundException('El torneo no fue encontrado');
    }
    return torneo;
  }

  // Una fase con partidos o equipos no puede cambiar de torneo.
  private async assertSinDatosAsociados(fase: Fase): Promise<void> {
    const partidos = await this.fasesRepository
      .createQueryBuilder('fase')
      .innerJoin('fase.partidos', 'partido')
      .where('fase.id = :id', { id: fase.id })
      .getCount();
    const equipos = fase.grupos
      ? await this.equiposRepository.count({
          where: { fase_grupos_id: fase.grupos.id },
        })
      : 0;
    if (partidos > 0 || equipos > 0) {
      throw new ConflictException(
        'No se puede cambiar el torneo de una fase que ya tiene partidos o equipos asignados',
      );
    }
  }

  // Reglas de la fase final: si finalizó solo se puede cambiar su estado, y
  // con partidos registrados no cambia la modalidad ni baja el número de partidos.
  private async assertFaseFinalEditable(
    fase: Fase,
    dto: UpdateFaseDto,
  ): Promise<void> {
    if (fase.estado === EstadoFase.FINALIZADA) {
      // Se compara contra los valores actuales: el front envía el formulario completo.
      const actuales: Partial<Record<keyof UpdateFaseDto, unknown>> = {
        numero_orden: fase.numero_orden,
        fecha_inicio: fase.fecha_inicio,
        fecha_fin: fase.fecha_fin,
        torneo_id: fase.torneo?.id ?? fase.torneo_id,
        numero_partidos: fase.final?.numero_partidos,
        modalidad: fase.final?.modalidad,
      };
      const cambiaOtroCampo = (
        Object.keys(actuales) as (keyof UpdateFaseDto)[]
      ).some(
        (campo) => dto[campo] !== undefined && dto[campo] !== actuales[campo],
      );
      if (cambiaOtroCampo) {
        throw new ConflictException(
          'La fase final ya finalizó; solo se puede cambiar su estado',
        );
      }
      return;
    }

    const cambiaModalidad =
      dto.modalidad !== undefined && dto.modalidad !== fase.final?.modalidad;
    if (!cambiaModalidad && dto.numero_partidos === undefined) return;

    const conPartidos = await this.fasesRepository.findOne({
      where: { id: fase.id },
      relations: { partidos: true },
    });
    const registrados = conPartidos?.partidos?.length ?? 0;
    if (registrados === 0) return;

    if (cambiaModalidad) {
      throw new ConflictException(
        'No se puede cambiar la modalidad de una fase final que ya tiene partidos registrados',
      );
    }
    if (
      dto.numero_partidos !== undefined &&
      dto.numero_partidos < registrados
    ) {
      throw new ConflictException(
        `La fase final ya tiene ${registrados} partidos registrados; el número de partidos no puede ser menor`,
      );
    }
  }

  // No se puede bajar el cupo por debajo de los equipos ya asignados.
  private async assertCupoNoMenorQueAsignados(
    grupoId: string,
    cupo: number,
  ): Promise<void> {
    const asignados = await this.equiposRepository.count({
      where: { fase_grupos_id: grupoId },
    });
    if (asignados > cupo) {
      throw new ConflictException(
        `El grupo ya tiene ${asignados} equipos asignados; el cupo no puede ser menor`,
      );
    }
  }

  private assertCreateSubtypeFields(dto: CreateFaseDto): void {
    const hasGruposFields =
      dto.nombre !== undefined || dto.cupo_equipos !== undefined;
    const hasFinalFields =
      dto.numero_partidos !== undefined || dto.modalidad !== undefined;

    if (
      (dto.tipo === TipoFase.GRUPOS &&
        (dto.nombre === undefined ||
          dto.cupo_equipos === undefined ||
          hasFinalFields)) ||
      (dto.tipo === TipoFase.FINAL &&
        (dto.numero_partidos === undefined ||
          dto.modalidad === undefined ||
          hasGruposFields))
    ) {
      throw new BadRequestException(
        'Los datos enviados deben corresponder al tipo de fase seleccionado',
      );
    }
  }
}
