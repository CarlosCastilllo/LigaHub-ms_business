import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  TableInheritance,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Torneo } from '../../torneos/entities/torneo.entity';

export enum EstadoFase {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
}

export enum TipoFase {
  GRUPOS = 'GRUPOS',
  FINAL = 'FINAL',
}

@Entity('fases')
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Fase {
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
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'torneo_id' })
  torneo!: Relation<Torneo>;

  @RelationId((fase: Fase) => fase.torneo)
  torneo_id!: string;
}
