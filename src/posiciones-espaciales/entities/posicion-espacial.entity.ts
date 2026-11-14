import { Pelota } from '../../pelotas/entities/pelota.entity';
import { Jugador } from '../../jugadores/entities/jugador.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity('posiciones_espaciales')
export class PosicionEspacial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'double' })
  x!: number;

  @Column({ type: 'double' })
  y!: number;

  @Column({ type: 'int' })
  tiempo_segundos!: number;

  @ManyToOne(() => Jugador, (jugador) => jugador.posiciones_espaciales, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'jugador_id' })
  jugador?: Relation<Jugador> | null;

  @RelationId((posicion: PosicionEspacial) => posicion.jugador)
  jugador_id?: string | null;

  @ManyToOne(() => Pelota, (pelota) => pelota.posiciones_espaciales, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'pelota_id' })
  pelota?: Relation<Pelota> | null;

  @RelationId((posicion: PosicionEspacial) => posicion.pelota)
  pelota_id?: string | null;
}
