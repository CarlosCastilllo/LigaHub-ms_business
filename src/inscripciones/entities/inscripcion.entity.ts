import { Torneo } from '../../torneos/entities/torneo.entity';
import { Equipo } from '../../equipos/entities/equipo.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoInscripcion {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
}

@Entity('inscripciones')
export class Inscripcion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  fecha_inscripcion!: string;

  @Column({
    type: 'enum',
    enum: EstadoInscripcion,
    default: EstadoInscripcion.PENDIENTE,
  })
  estado!: EstadoInscripcion;

  @ManyToOne(() => Equipo, (equipo) => equipo.inscripciones, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Relation<Equipo>;

  @RelationId((inscripcion: Inscripcion) => inscripcion.equipo)
  equipo_id!: string;

  @ManyToOne(() => Torneo, (torneo) => torneo.inscripciones, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Relation<Torneo>;

  @RelationId((inscripcion: Inscripcion) => inscripcion.torneo)
  torneo_id!: string;
}
