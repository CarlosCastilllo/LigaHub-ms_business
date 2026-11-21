import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoPartido, Partido } from '../partidos/entities/partido.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { AnotacionResponseDto } from './dto/anotacion-response.dto';
import { CreateAnotacionDto } from './dto/create-anotacion.dto';
import { UpdateAnotacionDto } from './dto/update-anotacion.dto';
import { Anotacion } from './entities/anotacion.entity';
import { AnotacionMapper } from './mappers/anotacion.mapper';

// Solo se registran anotaciones en partidos que ya empezaron.
const ESTADOS_CON_ANOTACIONES: EstadoPartido[] = [
  EstadoPartido.EN_JUEGO,
  EstadoPartido.FINALIZADO,
];

@Injectable()
export class AnotacionesService {
  constructor(
    @InjectRepository(Anotacion)
    private readonly anotacionesRepository: Repository<Anotacion>,
    @InjectRepository(Partido)
    private readonly partidosRepository: Repository<Partido>,
    @InjectRepository(Jugador)
    private readonly jugadoresRepository: Repository<Jugador>,
  ) {}

  async create(dto: CreateAnotacionDto): Promise<AnotacionResponseDto> {
    const partido = await this.findPartidoJugado(dto.partido_id);
    const jugador = await this.findJugador(dto.jugador_id);
    const saved = await this.anotacionesRepository.save(
      AnotacionMapper.toEntity(dto, partido, jugador),
    );
    return AnotacionMapper.toResponseDto(saved);
  }

  async findAll(): Promise<AnotacionResponseDto[]> {
    const anotaciones = await this.anotacionesRepository.find({
      relations: { partido: true, jugador: true },
    });
    return AnotacionMapper.toResponseDtoList(anotaciones);
  }

  async findOne(id: string): Promise<AnotacionResponseDto> {
    return AnotacionMapper.toResponseDto(await this.findAnotacion(id));
  }

  async update(
    id: string,
    dto: UpdateAnotacionDto,
  ): Promise<AnotacionResponseDto> {
    const anotacion = await this.findAnotacion(id);
    if (dto.partido_id !== undefined) {
      anotacion.partido = await this.findPartidoJugado(dto.partido_id);
    }
    if (dto.jugador_id !== undefined) {
      anotacion.jugador = await this.findJugador(dto.jugador_id);
    }
    const saved = await this.anotacionesRepository.save(
      AnotacionMapper.mergeEntity(anotacion, dto),
    );
    return AnotacionMapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const anotacion = await this.findAnotacion(id);
    await this.anotacionesRepository.remove(anotacion);
    return { message: 'La anotación se eliminó correctamente' };
  }

  private async findAnotacion(id: string): Promise<Anotacion> {
    const anotacion = await this.anotacionesRepository.findOne({
      where: { id },
      relations: { partido: true, jugador: true },
    });
    if (!anotacion) {
      throw new NotFoundException('La anotación no fue encontrada');
    }
    return anotacion;
  }

  private async findPartidoJugado(id: string): Promise<Partido> {
    const partido = await this.partidosRepository.findOne({ where: { id } });
    if (!partido) {
      throw new NotFoundException('El partido no fue encontrado');
    }
    if (!ESTADOS_CON_ANOTACIONES.includes(partido.estado)) {
      throw new BadRequestException(
        'Las anotaciones solo se pueden registrar en partidos en juego o finalizados',
      );
    }
    return partido;
  }

  private async findJugador(id: string): Promise<Jugador> {
    const jugador = await this.jugadoresRepository.findOne({ where: { id } });
    if (!jugador) {
      throw new NotFoundException('El jugador no fue encontrado');
    }
    return jugador;
  }
}
