import { Escenario } from '../../escenarios/entities/escenario.entity';
import { Torneo } from '../../torneos/entities/torneo.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoAsignacionEscenario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Entity('escenarios_torneo')
export class EscenarioTorneo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  fecha_asignacion!: string;

  @Column({
    type: 'enum',
    enum: EstadoAsignacionEscenario,
    default: EstadoAsignacionEscenario.ACTIVO,
  })
  estado!: EstadoAsignacionEscenario;

  // Entidad intermedia de la relacion N:N Torneo <-> Escenario:
  // es la duena de ambas FKs (escenario_id y torneo_id).
  @ManyToOne(() => Escenario, (escenario) => escenario.escenarios_torneo, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'escenario_id' })
  escenario!: Relation<Escenario>;

  @RelationId((escenarioTorneo: EscenarioTorneo) => escenarioTorneo.escenario)
  escenario_id!: string;

  @ManyToOne(() => Torneo, (torneo) => torneo.escenarios_torneo, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Relation<Torneo>;

  @RelationId((escenarioTorneo: EscenarioTorneo) => escenarioTorneo.torneo)
  torneo_id!: string;
}
