import { EscenarioTorneo } from '../../escenarios-torneo/entities/escenario-torneo.entity';
import { Localidad } from '../../localidades/entities/localidad.entity';
import { Partido } from '../../partidos/entities/partido.entity';
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

@Entity('escenarios')
export class Escenario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255 })
  direccion!: string;

  @Column({ type: 'int' })
  capacidad!: number;

  // Relacion 1:N reflexiva: un escenario (p. ej. un complejo deportivo)
  // puede contener muchos sub-escenarios. El lado dueno (FK
  // escenario_padre_id) y el inverso viven en esta misma entidad.
  @ManyToOne(() => Escenario, (escenario) => escenario.sub_escenarios, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'escenario_padre_id' })
  escenario_padre?: Relation<Escenario> | null;

  @RelationId((escenario: Escenario) => escenario.escenario_padre)
  escenario_padre_id?: string | null;

  @OneToMany(() => Escenario, (escenario) => escenario.escenario_padre, {
    cascade: false,
  })
  sub_escenarios?: Escenario[];

  // Lado inverso de la relacion 1:N Escenario -> Localidad.
  @OneToMany(() => Localidad, (localidad) => localidad.escenario, {
    cascade: false,
  })
  localidades?: Localidad[];

  // Lado inverso de la relacion 1:N Escenario -> Partido.
  @OneToMany(() => Partido, (partido) => partido.escenario, {
    cascade: false,
  })
  partidos?: Partido[];

  @OneToMany(
    () => EscenarioTorneo,
    (escenarioTorneo) => escenarioTorneo.escenario,
    { cascade: false },
  )
  escenarios_torneo?: EscenarioTorneo[];
}
