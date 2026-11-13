import { Aficionado } from '../../aficionados/entities/aficionado.entity';
import { decimalToNumber } from '../../common/transformers/decimal.transformer';
import { MetodoPagoAficionado } from '../../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
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

export enum PronosticoApuesta {
  LOCAL = 'LOCAL',
  EMPATE = 'EMPATE',
  VISITANTE = 'VISITANTE',
}

export enum EstadoApuesta {
  PENDIENTE = 'PENDIENTE',
  GANADA = 'GANADA',
  PERDIDA = 'PERDIDA',
  ANULADA = 'ANULADA',
}

// Entidad intermedia de la N:N Aficionado <-> Partido (apuestas).
@Entity('apuestas')
export class Apuesta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_apuesta!: Date;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  monto!: number;

  @Column({ type: 'enum', enum: PronosticoApuesta })
  pronostico!: PronosticoApuesta;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: decimalToNumber,
  })
  cuota!: number;

  @Column({
    type: 'enum',
    enum: EstadoApuesta,
    default: EstadoApuesta.PENDIENTE,
  })
  estado!: EstadoApuesta;

  @ManyToOne(() => Aficionado, (aficionado) => aficionado.apuestas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'aficionado_id' })
  aficionado!: Relation<Aficionado>;

  @RelationId((apuesta: Apuesta) => apuesta.aficionado)
  aficionado_id!: string;

  @ManyToOne(() => Partido, (partido) => partido.apuestas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'partido_id' })
  partido!: Relation<Partido>;

  @RelationId((apuesta: Apuesta) => apuesta.partido)
  partido_id!: string;

  // Lado dueno de la relacion 1:N MetodoPagoAficionado -> Apuesta:
  // cada apuesta se paga con un unico metodo registrado del aficionado.
  @ManyToOne(() => MetodoPagoAficionado, (mpa) => mpa.apuestas, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'metodo_pago_aficionado_id' })
  metodo_pago_aficionado!: Relation<MetodoPagoAficionado>;

  @RelationId((apuesta: Apuesta) => apuesta.metodo_pago_aficionado)
  metodo_pago_aficionado_id!: string;
}
