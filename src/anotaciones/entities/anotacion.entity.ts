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

@Entity('anotaciones')
export class Anotacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  minuto!: number;

  @Column({ type: 'varchar', length: 255 })
  descripcion!: string;

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
}
