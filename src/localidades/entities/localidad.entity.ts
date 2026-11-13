import { Boleta } from '../../boletas/entities/boleta.entity';
import { decimalToNumber } from '../../common/transformers/decimal.transformer';
import { Escenario } from '../../escenarios/entities/escenario.entity';
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

@Entity('localidades')
export class Localidad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'int' })
  capacidad!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  precio!: number;

  // Lado dueno de la relacion 1:N Escenario -> Localidad (FK escenario_id).
  @ManyToOne(() => Escenario, (escenario) => escenario.localidades, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'escenario_id' })
  escenario!: Relation<Escenario>;

  @RelationId((localidad: Localidad) => localidad.escenario)
  escenario_id!: string;

  // Lado inverso de la relacion 1:N Localidad -> Boleta.
  @OneToMany(() => Boleta, (boleta) => boleta.localidad, { cascade: false })
  boletas?: Boleta[];
}
