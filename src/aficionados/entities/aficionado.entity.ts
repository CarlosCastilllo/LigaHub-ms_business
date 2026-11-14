import { Apuesta } from '../../apuestas/entities/apuesta.entity';
import { Boleta } from '../../boletas/entities/boleta.entity';
import { MetodoPagoAficionado } from '../../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { AficionadoEquipo } from '../../aficionado-equipo/entities/aficionado-equipo.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('aficionados')
export class Aficionado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  documento!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono!: string | null;

  // Lado inverso de la N:N Aficionado <-> Partido mediante Boleta.
  @OneToMany(() => Boleta, (boleta) => boleta.aficionado, { cascade: false })
  boletas?: Boleta[];

  // Lado inverso de la N:N Aficionado <-> Partido mediante Apuesta.
  @OneToMany(() => Apuesta, (apuesta) => apuesta.aficionado, {
    cascade: false,
  })
  apuestas?: Apuesta[];

  // Lado inverso de la N:N Aficionado <-> MetodoPago mediante
  // MetodoPagoAficionado.
  @OneToMany(
    () => MetodoPagoAficionado,
    (metodoPagoAficionado) => metodoPagoAficionado.aficionado,
    { cascade: false },
  )
  metodos_pago_aficionado?: MetodoPagoAficionado[];

  @OneToMany(
    () => AficionadoEquipo,
    (aficionadoEquipo) => aficionadoEquipo.aficionado,
    { cascade: false },
  )
  equipos_preferidos?: AficionadoEquipo[];
}
