import { Equipo } from '../../equipos/entities/equipo.entity';
import { Jugador } from '../../jugadores/entities/jugador.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity('equipo_jugador')
export class EquipoJugador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  fecha_inicio!: string;

  @Column({ type: 'date', nullable: true })
  fecha_fin?: string | null;

  @ManyToOne(() => Equipo, (equipo) => equipo.jugadores_equipo, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Relation<Equipo>;

  @RelationId((equipoJugador: EquipoJugador) => equipoJugador.equipo)
  equipo_id!: string;

  @ManyToOne(() => Jugador, (jugador) => jugador.equipos_jugador, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'jugador_id' })
  jugador!: Relation<Jugador>;

  @RelationId((equipoJugador: EquipoJugador) => equipoJugador.jugador)
  jugador_id!: string;
}
