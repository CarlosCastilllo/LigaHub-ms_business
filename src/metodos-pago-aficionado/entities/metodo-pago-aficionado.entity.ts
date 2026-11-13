import { Aficionado } from '../../aficionados/entities/aficionado.entity';
import { Apuesta } from '../../apuestas/entities/apuesta.entity';
import { MetodoPago } from '../../metodos-pago/entities/metodo-pago.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum EstadoMetodoPagoAficionado {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

// Entidad intermedia de la N:N Aficionado <-> MetodoPago.
// Ademas es el lado "uno" de la relacion 1:N MetodoPagoAficionado -> Apuesta.
@Entity('metodos_pago_aficionado')
export class MetodoPagoAficionado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Identificador enmascarado (p. ej. "**** 4242"); nunca el numero completo.
  @Column({ type: 'varchar', length: 30 })
  referencia!: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_registro!: Date;

  @Column({ type: 'boolean', default: false })
  predeterminado!: boolean;

  @Column({
    type: 'enum',
    enum: EstadoMetodoPagoAficionado,
    default: EstadoMetodoPagoAficionado.ACTIVO,
  })
  estado!: EstadoMetodoPagoAficionado;

  @ManyToOne(
    () => Aficionado,
    (aficionado) => aficionado.metodos_pago_aficionado,
    { cascade: false, nullable: false, onDelete: 'NO ACTION' },
  )
  @JoinColumn({ name: 'aficionado_id' })
  aficionado!: Relation<Aficionado>;

  @RelationId((mpa: MetodoPagoAficionado) => mpa.aficionado)
  aficionado_id!: string;

  @ManyToOne(
    () => MetodoPago,
    (metodoPago) => metodoPago.metodos_pago_aficionado,
    { cascade: false, nullable: false, onDelete: 'NO ACTION' },
  )
  @JoinColumn({ name: 'metodo_pago_id' })
  metodo_pago!: Relation<MetodoPago>;

  @RelationId((mpa: MetodoPagoAficionado) => mpa.metodo_pago)
  metodo_pago_id!: string;

  @OneToMany(() => Apuesta, (apuesta) => apuesta.metodo_pago_aficionado, {
    cascade: false,
  })
  apuestas?: Apuesta[];
}
