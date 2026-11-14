import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pelota } from '../pelotas/entities/pelota.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { CreatePosicionEspacialDto } from './dto/create-posicion-espacial.dto';
import { PosicionEspacialResponseDto } from './dto/posicion-espacial-response.dto';
import { UpdatePosicionEspacialDto } from './dto/update-posicion-espacial.dto';
import { PosicionEspacial } from './entities/posicion-espacial.entity';
import { PosicionEspacialMapper } from './mappers/posicion-espacial.mapper';

@Injectable()
export class PosicionesEspacialesService {
  constructor(
    @InjectRepository(PosicionEspacial)
    private readonly posicionesRepository: Repository<PosicionEspacial>,
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
    @InjectRepository(Pelota)
    private readonly pelotasRepository: Repository<Pelota>,
  ) {}

  async create(
    dto: CreatePosicionEspacialDto,
  ): Promise<PosicionEspacialResponseDto> {
    this.validateSubject(dto.jugador_id, dto.pelota_id);
    const jugador = dto.jugador_id
      ? await this.findJugador(dto.jugador_id)
      : null;
    const pelota = dto.pelota_id ? await this.findPelota(dto.pelota_id) : null;
    const saved = await this.posicionesRepository.save(
      PosicionEspacialMapper.toEntity(dto, jugador, pelota),
    );
    return PosicionEspacialMapper.toResponseDto(saved);
  }

  async findAll(): Promise<PosicionEspacialResponseDto[]> {
    const posiciones = await this.posicionesRepository.find({
      relations: { jugador: true, pelota: true },
    });
    return PosicionEspacialMapper.toResponseDtoList(posiciones);
  }

  async findOne(id: string): Promise<PosicionEspacialResponseDto> {
    return PosicionEspacialMapper.toResponseDto(await this.findPosicion(id));
  }

  async update(
    id: string,
    dto: UpdatePosicionEspacialDto,
  ): Promise<PosicionEspacialResponseDto> {
    const posicion = await this.findPosicion(id);
    const jugadorId =
      dto.jugador_id !== undefined
        ? dto.jugador_id
        : (posicion.jugador?.id ?? posicion.jugador_id ?? null);
    const pelotaId =
      dto.pelota_id !== undefined
        ? dto.pelota_id
        : (posicion.pelota?.id ?? posicion.pelota_id ?? null);
    this.validateSubject(jugadorId, pelotaId);

    if (dto.jugador_id !== undefined) {
      posicion.jugador = dto.jugador_id
        ? await this.findJugador(dto.jugador_id)
        : null;
    }
    if (dto.pelota_id !== undefined) {
      posicion.pelota = dto.pelota_id
        ? await this.findPelota(dto.pelota_id)
        : null;
    }
    const saved = await this.posicionesRepository.save(
      PosicionEspacialMapper.mergeEntity(posicion, dto),
    );
    return PosicionEspacialMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const posicion = await this.findPosicion(id);
    await this.posicionesRepository.remove(posicion);
    return { message: `PosicionEspacial #${id} deleted successfully` };
  }

  private validateSubject(
    jugadorId: string | null | undefined,
    pelotaId: string | null | undefined,
  ): void {
    if (Boolean(jugadorId) === Boolean(pelotaId)) {
      throw new BadRequestException(
        'A posicion must belong to exactly one jugador or pelota',
      );
    }
  }

  private async findPosicion(id: string): Promise<PosicionEspacial> {
    const posicion = await this.posicionesRepository.findOne({
      where: { id },
      relations: { jugador: true, pelota: true },
    });
    if (!posicion) {
      throw new NotFoundException(
        `PosicionEspacial with id ${id} not found`,
      );
    }
    return posicion;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    return jugador;
  }

  private async findPelota(id: string): Promise<Pelota> {
    const pelota = await this.pelotasRepository.findOne({ where: { id } });
    if (!pelota) {
      throw new NotFoundException(`Pelota with id ${id} not found`);
    }
    return pelota;
  }
}
