import { Partido } from '../../partidos/entities/partido.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoPelota {
  NUEVA = 'NUEVA',
  USADA = 'USADA',
  DESGASTADA = 'DESGASTADA',
}

@Entity('pelotas')
export class Pelota {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  marca!: string;

  @Column({ type: 'varchar', length: 80 })
  modelo!: string;

  @Column({ type: 'int' })
  talla!: number;

  @Column({ type: 'enum', enum: EstadoPelota, default: EstadoPelota.NUEVA })
  estado!: EstadoPelota;

  // Lado dueno de la relacion 1:1 Partido <-> Pelota (FK partido_id).
  // @OneToOne hace que partido_id sea UNIQUE. Es opcional: una pelota puede
  // existir sin partido y asignarse despues. NO ACTION: no se borra un
  // partido que tenga pelota asignada.
  @OneToOne(() => Partido, (partido) => partido.pelota, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'partido_id' })
  partido?: Relation<Partido> | null;

  @RelationId((pelota: Pelota) => pelota.partido)
  partido_id?: string | null;
}
