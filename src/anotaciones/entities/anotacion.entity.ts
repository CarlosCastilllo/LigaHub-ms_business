import { Equipo } from '../../equipos/entities/equipo.entity';
import { Partido } from '../../partidos/entities/partido.entity';
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

// HU-GC-07: una anotación es un gol. El marcador del partido se calcula
// contando las anotaciones de cada equipo.
@Entity('anotaciones')
export class Anotacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  minuto!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string | null;

  // Lado dueno de la relacion 1:N Partido -> Anotacion (FK partido_id).
  // CASCADE: las anotaciones se borran junto con su partido.
  @ManyToOne(() => Partido, (partido) => partido.anotaciones, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partido_id' })
  partido!: Relation<Partido>;

  @RelationId((anotacion: Anotacion) => anotacion.partido)
  partido_id!: string;

  @ManyToOne(() => Jugador, (jugador) => jugador.anotaciones, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'jugador_id' })
  jugador!: Relation<Jugador>;

  @RelationId((anotacion: Anotacion) => anotacion.jugador)
  jugador_id!: string;

  // Equipo al que se suma el gol (local o visitante del partido). Se fija al
  // registrarlo para que el histórico no cambie si el jugador se traslada.
  @ManyToOne(() => Equipo, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Relation<Equipo>;

  @RelationId((anotacion: Anotacion) => anotacion.equipo)
  equipo_id!: string;
}
