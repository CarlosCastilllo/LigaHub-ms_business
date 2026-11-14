import { Aficionado } from '../../aficionados/entities/aficionado.entity';
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

@Entity('aficionados_equipos')
@Index('UQ_aficionados_equipos_aficionado_equipo', [
  'aficionado',
  'equipo',
], { unique: true })
export class AficionadoEquipo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Aficionado, (aficionado) => aficionado.equipos_preferidos, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'aficionado_id' })
  aficionado!: Relation<Aficionado>;

  @RelationId(
    (aficionadoEquipo: AficionadoEquipo) => aficionadoEquipo.aficionado,
  )
  aficionado_id!: string;

  @ManyToOne(() => Equipo, (equipo) => equipo.aficionados_equipo, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Relation<Equipo>;

  @RelationId((aficionadoEquipo: AficionadoEquipo) => aficionadoEquipo.equipo)
  equipo_id!: string;
}
