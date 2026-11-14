import { Deporte } from '../../deportes/entities/deporte.entity';
import { Equipo } from '../../equipos/entities/equipo.entity';
import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity('equipos-deportes')
@Index('UQ_equipos_deportes_equipo_deporte', ['equipo', 'deporte'], {
  unique: true,
})
export class EquipoDeporte {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Equipo, (equipo) => equipo.equipos_deportes, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Relation<Equipo>;

  @RelationId((equipoDeporte: EquipoDeporte) => equipoDeporte.equipo)
  equipo_id!: string;

  @ManyToOne(() => Deporte, (deporte) => deporte.equipos_deportes, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'deporte_id' })
  deporte!: Relation<Deporte>;

  @RelationId((equipoDeporte: EquipoDeporte) => equipoDeporte.deporte)
  deporte_id!: string;
}
