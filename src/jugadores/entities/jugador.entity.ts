import { Anotacion } from '../../anotaciones/entities/anotacion.entity';
import { PosicionEspacial } from '../../posiciones-espaciales/entities/posicion-espacial.entity';
import { EquipoJugador } from '../../equipo-jugador/entities/equipo-jugador.entity';
import { HabilidadJugador } from '../../habilidad-jugador/entities/habilidad-jugador.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('jugadores')
export class Jugador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombres!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ type: 'date' })
  fecha_nacimiento!: string;

  @Column({ type: 'varchar', length: 100 })
  nacionalidad!: string;

  @OneToMany(() => Anotacion, (anotacion) => anotacion.jugador, {
    cascade: false,
  })
  anotaciones?: Anotacion[];

  @OneToMany(
    () => PosicionEspacial,
    (posicion) => posicion.jugador,
    { cascade: false },
  )
  posiciones_espaciales?: PosicionEspacial[];

  @OneToMany(
    () => EquipoJugador,
    (equipoJugador) => equipoJugador.jugador,
    { cascade: false },
  )
  equipos_jugador?: EquipoJugador[];

  @OneToMany(
    () => HabilidadJugador,
    (habilidadJugador) => habilidadJugador.jugador,
    { cascade: false },
  )
  habilidades_jugador?: HabilidadJugador[];
}
