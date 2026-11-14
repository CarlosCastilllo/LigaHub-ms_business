import { Fase } from '../../fases/entities/fase.entity';
import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';
import { EscenarioTorneo } from '../../escenarios-torneo/entities/escenario-torneo.entity';
import { Deporte } from '../../deportes/entities/deporte.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoTorneo {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADO = 'FINALIZADO',
}

@Entity('torneos')
export class Torneo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'enum', enum: EstadoTorneo, default: EstadoTorneo.PENDIENTE })
  estado!: EstadoTorneo;

  @Column({ type: 'int' })
  max_equipos!: number;

  @ManyToOne(() => Deporte, (deporte) => deporte.torneos, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'deporte_id' })
  deporte!: Relation<Deporte>;

  @RelationId((torneo: Torneo) => torneo.deporte)
  deporte_id!: string;

  @OneToMany(() => Fase, (fase) => fase.torneo, { cascade: false })
  fases?: Fase[];

  @OneToMany(
    () => Inscripcion,
    (inscripcion) => inscripcion.torneo,
    { cascade: false },
  )
  inscripciones?: Inscripcion[];

  @OneToMany(
    () => EscenarioTorneo,
    (escenarioTorneo) => escenarioTorneo.torneo,
    { cascade: false },
  )
  escenarios_torneo?: EscenarioTorneo[];
}
