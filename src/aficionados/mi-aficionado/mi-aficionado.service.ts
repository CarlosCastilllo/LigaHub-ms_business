import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AficionadoEquipo } from '../../aficionado-equipo/entities/aficionado-equipo.entity';
import { isDuplicateEntry } from '../../common/database/is-duplicate-entry';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Aficionado } from '../entities/aficionado.entity';
import { AsociarEquipoDto } from './dto/asociar-equipo.dto';
import { ConvertirseAficionadoDto } from './dto/convertirse-aficionado.dto';
import {
  EquipoAsociadoDto,
  EquipoDisponibleDto,
  MiAficionadoResponseDto,
} from './dto/mi-aficionado-response.dto';

/**
 * HU-GE-05: el usuario autenticado se convierte en aficionado y gestiona los
 * equipos que sigue. El aficionado siempre se resuelve desde el user_id del
 * token, así nadie puede leer ni modificar las asociaciones de otro.
 */
@Injectable()
export class MiAficionadoService {
  constructor(
    @InjectRepository(Aficionado)
    private readonly aficionadosRepository: Repository<Aficionado>,
    @InjectRepository(AficionadoEquipo)
    private readonly relacionesRepository: Repository<AficionadoEquipo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
  ) {}

  async findMine(userId: number): Promise<MiAficionadoResponseDto> {
    const aficionado = await this.resolverAficionado(userId);
    return this.toResponse(aficionado, await this.findAsociaciones(aficionado));
  }

  async convertirse(
    userId: number,
    dto: ConvertirseAficionadoDto,
  ): Promise<MiAficionadoResponseDto> {
    if (await this.aficionadosRepository.findOne({ where: { user_id: userId } })) {
      throw new ConflictException('Tu usuario ya está registrado como aficionado');
    }
    await this.assertDatosUnicos(dto.documento, dto.email);
    const equipos = await this.findEquiposActivos(dto.equipo_ids ?? []);

    try {
      return await this.aficionadosRepository.manager.transaction(
        async (manager: EntityManager) => {
          const aficionado = await manager.save(
            Object.assign(new Aficionado(), {
              user_id: userId,
              nombre: dto.nombre,
              documento: dto.documento,
              email: dto.email,
              telefono: dto.telefono ?? null,
            }),
          );
          const asociaciones = await manager.save(
            equipos.map((equipo) =>
              Object.assign(new AficionadoEquipo(), { aficionado, equipo }),
            ),
          );
          return this.toResponse(aficionado, asociaciones);
        },
      );
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(
          'Ya existe un aficionado con ese usuario, documento o correo',
        );
      }
      throw error;
    }
  }

  async findEquiposDisponibles(): Promise<EquipoDisponibleDto[]> {
    const equipos = await this.equiposRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    return equipos.map(({ id, nombre }) => ({ id, nombre }));
  }

  async asociarEquipo(
    userId: number,
    dto: AsociarEquipoDto,
  ): Promise<EquipoAsociadoDto> {
    const aficionado = await this.resolverAficionado(userId);
    const [equipo] = await this.findEquiposActivos([dto.equipo_id]);
    const existente = await this.relacionesRepository.findOne({
      where: { aficionado: { id: aficionado.id }, equipo: { id: equipo.id } },
    });
    if (existente) {
      throw new ConflictException(`Ya sigues al equipo "${equipo.nombre}"`);
    }
    try {
      const saved = await this.relacionesRepository.save(
        Object.assign(new AficionadoEquipo(), { aficionado, equipo }),
      );
      return this.toEquipoAsociado(saved);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(`Ya sigues al equipo "${equipo.nombre}"`);
      }
      throw error;
    }
  }

  // Solo se borra la fila de aficionados_equipos: el aficionado y el equipo
  // se conservan.
  async retirarEquipo(
    userId: number,
    equipoId: string,
  ): Promise<{ message: string }> {
    const aficionado = await this.resolverAficionado(userId);
    const relacion = await this.relacionesRepository.findOne({
      where: { aficionado: { id: aficionado.id }, equipo: { id: equipoId } },
      relations: { equipo: true },
    });
    if (!relacion) {
      throw new NotFoundException('No sigues a ese equipo');
    }
    await this.relacionesRepository.remove(relacion);
    return {
      message: `Dejaste de seguir al equipo "${relacion.equipo.nombre}"`,
    };
  }

  async resolverAficionado(userId: number): Promise<Aficionado> {
    const aficionado = await this.aficionadosRepository.findOne({
      where: { user_id: userId },
    });
    if (!aficionado) {
      throw new NotFoundException('Tu usuario todavía no es aficionado');
    }
    return aficionado;
  }

  private findAsociaciones(aficionado: Aficionado): Promise<AficionadoEquipo[]> {
    return this.relacionesRepository.find({
      where: { aficionado: { id: aficionado.id } },
      relations: { equipo: true },
      order: { equipo: { nombre: 'ASC' } },
    });
  }

  private async findEquiposActivos(ids: string[]): Promise<Equipo[]> {
    if (ids.length === 0) return [];
    const equipos = await this.equiposRepository.find({ where: { id: In(ids) } });
    const porId = new Map(equipos.map((equipo) => [equipo.id, equipo]));
    return ids.map((id) => {
      const equipo = porId.get(id);
      if (!equipo) {
        throw new NotFoundException('El equipo no fue encontrado');
      }
      if (!equipo.activo) {
        throw new BadRequestException(
          `El equipo "${equipo.nombre}" no está activo`,
        );
      }
      return equipo;
    });
  }

  private async assertDatosUnicos(documento: string, email: string): Promise<void> {
    if (await this.aficionadosRepository.findOne({ where: { documento } })) {
      throw new ConflictException(
        `Ya existe un aficionado con el documento ${documento}`,
      );
    }
    if (await this.aficionadosRepository.findOne({ where: { email } })) {
      throw new ConflictException(`Ya existe un aficionado con el correo ${email}`);
    }
  }

  private toResponse(
    aficionado: Aficionado,
    asociaciones: AficionadoEquipo[],
  ): MiAficionadoResponseDto {
    return {
      id: aficionado.id,
      user_id: aficionado.user_id as number,
      nombre: aficionado.nombre,
      documento: aficionado.documento,
      email: aficionado.email,
      telefono: aficionado.telefono ?? null,
      equipos: asociaciones.map((relacion) => this.toEquipoAsociado(relacion)),
    };
  }

  private toEquipoAsociado(relacion: AficionadoEquipo): EquipoAsociadoDto {
    return {
      asociacion_id: relacion.id,
      equipo_id: relacion.equipo.id,
      nombre: relacion.equipo.nombre,
      activo: relacion.equipo.activo,
    };
  }
}
