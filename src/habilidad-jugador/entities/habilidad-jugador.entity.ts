import { Habilidad } from '../../habilidades/entities/habilidad.entity';
import { Jugador } from '../../jugadores/entities/jugador.entity';
import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity('habilidad-jugador')
@Index('UQ_habilidad_jugador_habilidad_jugador', ['habilidad', 'jugador'], {
  unique: true,
})
export class HabilidadJugador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Habilidad, (habilidad) => habilidad.jugadores_habilidad, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'habilidad_id' })
  habilidad!: Relation<Habilidad>;

  @RelationId(
    (habilidadJugador: HabilidadJugador) => habilidadJugador.habilidad,
  )
  habilidad_id!: string;

  @ManyToOne(() => Jugador, (jugador) => jugador.habilidades_jugador, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'jugador_id' })
  jugador!: Relation<Jugador>;

  @RelationId((habilidadJugador: HabilidadJugador) => habilidadJugador.jugador)
  jugador_id!: string;
}
