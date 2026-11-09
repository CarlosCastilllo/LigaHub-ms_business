import { ChildEntity, Column } from 'typeorm';
import { Fase } from './fase.entity';

export enum ModalidadFinal {
  PARTIDO_UNICO = 'PARTIDO_UNICO',
  IDA_Y_VUELTA = 'IDA_Y_VUELTA',
}

@ChildEntity('FINAL')
export class FaseFinal extends Fase {
  @Column({ type: 'int', nullable: true })
  numero_partidos!: number | null;

  @Column({
    type: 'enum',
    enum: ModalidadFinal,
    nullable: true,
  })
  modalidad!: ModalidadFinal | null;
}
