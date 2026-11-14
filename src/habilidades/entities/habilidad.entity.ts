import { HabilidadJugador } from '../../habilidad-jugador/entities/habilidad-jugador.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('habilidades')
export class Habilidad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
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
