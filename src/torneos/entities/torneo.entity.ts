import { Fase } from '../../fases/entities/fase.entity';
import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';
import { EscenarioTorneo } from '../../escenarios-torneo/entities/escenario-torneo.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'uuid' })
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
