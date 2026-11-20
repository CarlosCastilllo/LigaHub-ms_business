import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const PARTIDO_FASE_FK = 'FK_partidos_fase_id_fases_id';

export class RelatePartidosToFases1794180000014
  implements MigrationInterface
{
  name = 'RelatePartidosToFases1794180000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `partidos` ADD `fase_id` varchar(36) NULL',
    );
    await queryRunner.createForeignKey(
      'partidos',
      new TableForeignKey({
        name: PARTIDO_FASE_FK,
        columnNames: ['fase_id'],
        referencedTableName: 'fases',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const partidos = await queryRunner.getTable('partidos');
    const foreignKey = partidos?.foreignKeys.find(
      (key) => key.name === PARTIDO_FASE_FK,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('partidos', foreignKey);
    }
    if (partidos?.findColumnByName('fase_id')) {
      await queryRunner.dropColumn('partidos', 'fase_id');
    }
  }
}
