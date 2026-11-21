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
import { Torneo } from '../../torneos/entities/torneo.entity';
import { Partido } from '../../partidos/entities/partido.entity';
import { FaseGrupos } from './fase-grupos.entity';
import { FaseFinal } from './fase-final.entity';

export enum EstadoFase {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
}

// Ya no es una columna: el tipo se deduce del detalle 1:1 que tenga la fase
// (fases_grupos o fases_finales). Se mantiene para la API y los filtros.
export enum TipoFase {
  GRUPOS = 'GRUPOS',
  FINAL = 'FINAL',
}

// numero_orden ya no es unico por torneo: varios grupos pueden compartir etapa.
@Entity('fases')
export class Fase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  numero_orden!: number;

  @Column({ type: 'date' })
  fecha_inicio!: string;

  @Column({ type: 'date' })
  fecha_fin!: string;

  @Column({ type: 'enum', enum: EstadoFase, default: EstadoFase.PENDIENTE })
  estado!: EstadoFase;

  @ManyToOne(() => Torneo, (torneo) => torneo.fases, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Relation<Torneo>;

  @RelationId((fase: Fase) => fase.torneo)
  torneo_id!: string;

  @OneToMany(() => Partido, (partido) => partido.fase, { cascade: false })
  partidos?: Partido[];

  // Lado inverso de la 1:1 Fase <-> FaseGrupos (la FK vive en fases_grupos).
  @OneToOne(() => FaseGrupos, (grupos) => grupos.fase, {
    cascade: ['insert', 'update'],
  })
  grupos?: Relation<FaseGrupos> | null;

  // Lado inverso de la 1:1 Fase <-> FaseFinal (la FK vive en fases_finales).
  @OneToOne(() => FaseFinal, (final) => final.fase, {
    cascade: ['insert', 'update'],
  })
  final?: Relation<FaseFinal> | null;
}
