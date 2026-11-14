import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { JugadorResponseDto } from './dto/jugador-response.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Jugador } from './entities/jugador.entity';
import { JugadorMapper } from './mappers/jugador.mapper';

@Injectable()
export class JugadoresService {
  constructor(
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
  ) {}

  async create(dto: CreateJugadorDto): Promise<JugadorResponseDto> {
    const saved = await this.jugadoresRepository.save(
      JugadorMapper.toEntity(dto),
    );
    return JugadorMapper.toResponseDto(saved);
  }

  async findAll(): Promise<JugadorResponseDto[]> {
    const jugadores = await this.jugadoresRepository.find();
    return JugadorMapper.toResponseDtoList(jugadores);
  }

  async findOne(id: string): Promise<JugadorResponseDto> {
    return JugadorMapper.toResponseDto(await this.findJugador(id));
  }

  async update(
    id: string,
    dto: UpdateJugadorDto,
  ): Promise<JugadorResponseDto> {
    const jugador = await this.findJugador(id);
    const saved = await this.jugadoresRepository.save(
      JugadorMapper.mergeEntity(jugador, dto),
    );
    return JugadorMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const jugador = await this.jugadoresRepository.findOne({
      where: { id },
      relations: {
        anotaciones: true,
        posiciones_espaciales: true,
        equipos_jugador: true,
        habilidades_jugador: true,
      },
    });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    if (
      jugador.anotaciones?.length ||
      jugador.posiciones_espaciales?.length ||
      jugador.equipos_jugador?.length ||
      jugador.habilidades_jugador?.length
    ) {
      throw new ConflictException(
        `Jugador #${id} has anotaciones, posiciones espaciales, equipo history or habilidades; delete or reassign them first`,
      );
    }
    await this.jugadoresRepository.remove(jugador);
    return { message: `Jugador #${id} deleted successfully` };
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException(`Jugador with id ${id} not found`);
    }
    return jugador;
  }
}
