import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Fase } from './fase.entity';

export enum ModalidadFinal {
  PARTIDO_UNICO = 'PARTIDO_UNICO',
  IDA_Y_VUELTA = 'IDA_Y_VUELTA',
}

@Entity('fases_finales')
export class FaseFinal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', nullable: true })
  numero_partidos!: number | null;

  @Column({
    type: 'enum',
    enum: ModalidadFinal,
    nullable: true,
  })
  modalidad!: ModalidadFinal | null;

  // Lado dueño de la 1:1: fases_finales.fase_id es FK unica a fases.id.
  @OneToOne(() => Fase, (fase) => fase.final, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fase_id' })
  fase!: Relation<Fase>;

  @RelationId((final: FaseFinal) => final.fase)
  fase_id!: string;
}
