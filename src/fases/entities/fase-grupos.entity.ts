import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Fase } from './fase.entity';
import { Equipo } from '../../equipos/entities/equipo.entity';

@Entity('fases_grupos')
export class FaseGrupos {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nombre del grupo dentro de su torneo (p. ej. "Grupo A").
  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  // Cantidad maxima de equipos que admite este grupo.
  @Column({ type: 'int', nullable: true })
  cupo_equipos!: number | null;

  // Lado dueño de la 1:1: fases_grupos.fase_id es FK unica a fases.id.
  @OneToOne(() => Fase, (fase) => fase.grupos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fase_id' })
  fase!: Relation<Fase>;

  @RelationId((grupos: FaseGrupos) => grupos.fase)
  fase_id!: string;

  @OneToMany(() => Equipo, (equipo) => equipo.fase_grupos, { cascade: false })
  equipos?: Equipo[];
}
