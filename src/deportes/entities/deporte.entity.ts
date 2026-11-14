import { EquipoDeporte } from '../../equipos-deportes/entities/equipo-deporte.entity';
import { Torneo } from '../../torneos/entities/torneo.entity';
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

@Entity('deportes')
export class Deporte {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @ManyToOne(() => Deporte, (deporte) => deporte.deportes_hijos, {
    cascade: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'deporte_padre_id' })
  deporte_padre?: Relation<Deporte> | null;

  @RelationId((deporte: Deporte) => deporte.deporte_padre)
  deporte_padre_id?: string | null;

  @OneToMany(() => Deporte, (deporte) => deporte.deporte_padre, {
    cascade: false,
  })
  deportes_hijos?: Deporte[];

  @OneToMany(() => Torneo, (torneo) => torneo.deporte, { cascade: false })
  torneos?: Torneo[];

  @OneToMany(
    () => EquipoDeporte,
    (equipoDeporte) => equipoDeporte.deporte,
    { cascade: false },
  )
  equipos_deportes?: EquipoDeporte[];
}
