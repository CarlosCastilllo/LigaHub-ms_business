import { ChildEntity, Column } from 'typeorm';
import { Fase } from './fase.entity';

@ChildEntity('GRUPOS')
export class FaseGrupos extends Fase {
  @Column({ type: 'int', nullable: true })
  cantidad_grupos!: number | null;

  @Column({ type: 'int', nullable: true })
  equipos_por_grupo!: number | null;
}
