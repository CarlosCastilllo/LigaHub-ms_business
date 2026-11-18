import { HabilidadJugador } from '../../habilidad-jugador/entities/habilidad-jugador.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('habilidades')
@Index('UQ_habilidades_nombre', ['nombre'], { unique: true })
export class Habilidad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // La collation hace que el índice único ignore mayúsculas y tildes.
  @Column({
    type: 'varchar',
    length: 150,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @OneToMany(
    () => HabilidadJugador,
    (habilidadJugador) => habilidadJugador.habilidad,
    { cascade: false },
  )
  jugadores_habilidad?: HabilidadJugador[];
}
