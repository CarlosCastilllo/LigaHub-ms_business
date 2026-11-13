import { Anotacion } from '../../anotaciones/entities/anotacion.entity';
import { Apuesta } from '../../apuestas/entities/apuesta.entity';
import { Boleta } from '../../boletas/entities/boleta.entity';
import { Escenario } from '../../escenarios/entities/escenario.entity';
import { Pelota } from '../../pelotas/entities/pelota.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoPartido {
  PROGRAMADO = 'PROGRAMADO',
  EN_JUEGO = 'EN_JUEGO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

@Entity('partidos')
export class Partido {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime' })
  fecha_hora!: Date;

  @Column({
    type: 'enum',
    enum: EstadoPartido,
    default: EstadoPartido.PROGRAMADO,
  })
  estado!: EstadoPartido;

  // Equipo vive en otro microservicio: se guardan como UUID sin FK,
  // igual que equipo_id en Inscripcion.
  @Column({ type: 'uuid' })
  equipo_local_id!: string;

  @Column({ type: 'uuid' })
  equipo_visitante_id!: string;

  @Column({ type: 'int', default: 0 })
  goles_local!: number;

  @Column({ type: 'int', default: 0 })
  goles_visitante!: number;

  // Lado dueno de la relacion 1:N Escenario -> Partido (FK escenario_id).
  // NO ACTION: un escenario con partidos no se puede borrar.
  @ManyToOne(() => Escenario, (escenario) => escenario.partidos, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'escenario_id' })
  escenario!: Relation<Escenario>;

  @RelationId((partido: Partido) => partido.escenario)
  escenario_id!: string;

  // Lado inverso de la N:N Aficionado <-> Partido mediante Boleta.
  @OneToMany(() => Boleta, (boleta) => boleta.partido, { cascade: false })
  boletas?: Boleta[];

  // Lado inverso de la N:N Aficionado <-> Partido mediante Apuesta.
  @OneToMany(() => Apuesta, (apuesta) => apuesta.partido, { cascade: false })
  apuestas?: Apuesta[];

  // Lado inverso de la relacion 1:N Partido -> Anotacion.
  @OneToMany(() => Anotacion, (anotacion) => anotacion.partido, {
    cascade: false,
  })
  anotaciones?: Anotacion[];

  // Lado inverso de la relacion 1:1 Partido <-> Pelota.
  @OneToOne(() => Pelota, (pelota) => pelota.partido)
  pelota?: Pelota | null;
}
