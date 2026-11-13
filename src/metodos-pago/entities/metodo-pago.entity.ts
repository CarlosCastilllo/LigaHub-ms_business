import { MetodoPagoAficionado } from '../../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoMetodoPago {
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  BILLETERA_DIGITAL = 'BILLETERA_DIGITAL',
  PSE = 'PSE',
  EFECTIVO = 'EFECTIVO',
}

@Entity('metodos_pago')
export class MetodoPago {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'enum', enum: TipoMetodoPago })
  tipo!: TipoMetodoPago;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  // Lado inverso de la N:N Aficionado <-> MetodoPago mediante
  // MetodoPagoAficionado.
  @OneToMany(
    () => MetodoPagoAficionado,
    (metodoPagoAficionado) => metodoPagoAficionado.metodo_pago,
    { cascade: false },
  )
  metodos_pago_aficionado?: MetodoPagoAficionado[];
}
