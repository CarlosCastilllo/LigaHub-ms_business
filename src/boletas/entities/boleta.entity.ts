import { Aficionado } from '../../aficionados/entities/aficionado.entity';
import { decimalToNumber } from '../../common/transformers/decimal.transformer';
import { Localidad } from '../../localidades/entities/localidad.entity';
import { Partido } from '../../partidos/entities/partido.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoBoleta {
  ACTIVA = 'ACTIVA',
  USADA = 'USADA',
  ANULADA = 'ANULADA',
}

// Entidad intermedia de la N:N Aficionado <-> Partido (compra de boletas).
// Ademas pertenece a una Localidad (relacion 1:N Localidad -> Boleta).
@Entity('boletas')
export class Boleta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_compra!: Date;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  precio!: number;

  @Column({ type: 'enum', enum: EstadoBoleta, default: EstadoBoleta.ACTIVA })
  estado!: EstadoBoleta;

  @ManyToOne(() => Aficionado, (aficionado) => aficionado.boletas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'aficionado_id' })
  aficionado!: Relation<Aficionado>;

  @RelationId((boleta: Boleta) => boleta.aficionado)
  aficionado_id!: string;

  @ManyToOne(() => Partido, (partido) => partido.boletas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'partido_id' })
  partido!: Relation<Partido>;

  @RelationId((boleta: Boleta) => boleta.partido)
  partido_id!: string;

  @ManyToOne(() => Localidad, (localidad) => localidad.boletas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'localidad_id' })
  localidad!: Relation<Localidad>;

  @RelationId((boleta: Boleta) => boleta.localidad)
  localidad_id!: string;
}
