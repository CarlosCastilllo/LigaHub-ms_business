import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';
import { Partido } from '../../partidos/entities/partido.entity';
import { EquipoJugador } from '../../equipo-jugador/entities/equipo-jugador.entity';
import { AficionadoEquipo } from '../../aficionado-equipo/entities/aficionado-equipo.entity';
import { EquipoDeporte } from '../../equipos-deportes/entities/equipo-deporte.entity';
import { FaseGrupos } from '../../fases/entities/fase-grupos.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity('equipos')
export class Equipo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  // FK a fases_grupos.id (solo fases de grupos, no a la tabla general fases).
  @Column({ type: 'uuid', nullable: true })
  fase_grupos_id?: string | null;

  @ManyToOne(() => FaseGrupos, (faseGrupos) => faseGrupos.equipos, {
    cascade: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'fase_grupos_id' })
  fase_grupos?: Relation<FaseGrupos> | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => EquipoJugador, (equipoJugador) => equipoJugador.equipo, {
    cascade: false,
  })
  jugadores_equipo?: EquipoJugador[];

  @OneToMany(() => Inscripcion, (inscripcion) => inscripcion.equipo, {
    cascade: false,
  })
  inscripciones?: Inscripcion[];

  @OneToMany(() => Partido, (partido) => partido.equipo_local, {
    cascade: false,
  })
  partidos_locales?: Partido[];

  @OneToMany(() => Partido, (partido) => partido.equipo_visitante, {
    cascade: false,
  })
  partidos_visitantes?: Partido[];

  @OneToMany(
    () => AficionadoEquipo,
    (aficionadoEquipo) => aficionadoEquipo.equipo,
    { cascade: false },
  )
  aficionados_equipo?: AficionadoEquipo[];

  @OneToMany(() => EquipoDeporte, (equipoDeporte) => equipoDeporte.equipo, {
    cascade: false,
  })
  equipos_deportes?: EquipoDeporte[];
}
