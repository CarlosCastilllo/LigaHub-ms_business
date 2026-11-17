import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const TORNEO_CHILD_FOREIGN_KEYS = [
  { name: 'FK_fases_torneo_id_torneos_id', table: 'fases' },
  { name: 'FK_inscripciones_torneo_id_torneos_id', table: 'inscripciones' },
  {
    name: 'FK_escenarios_torneo_torneo_id_torneos_id',
    table: 'escenarios_torneo',
  },
] as const;

type OnDelete = 'CASCADE' | 'NO ACTION';

export class RestrictTorneoDeletionAndAddActivo1794180000009
  implements MigrationInterface
{
  name = 'RestrictTorneoDeletionAndAddActivo1794180000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `torneos` ADD `activo` tinyint NOT NULL DEFAULT 1',
    );
    await this.replaceTorneoChildForeignKeys(queryRunner, 'NO ACTION');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.replaceTorneoChildForeignKeys(queryRunner, 'CASCADE');
    await queryRunner.query('ALTER TABLE `torneos` DROP COLUMN `activo`');
  }

  private async replaceTorneoChildForeignKeys(
    queryRunner: QueryRunner,
    onDelete: OnDelete,
  ): Promise<void> {
    for (const foreignKey of TORNEO_CHILD_FOREIGN_KEYS) {
      const table = await queryRunner.getTable(foreignKey.table);
      const existingForeignKey = table?.foreignKeys.find(
        (key) => key.name === foreignKey.name,
      );
      if (existingForeignKey) {
        await queryRunner.dropForeignKey(foreignKey.table, existingForeignKey);
      }
      await queryRunner.createForeignKey(
        foreignKey.table,
        new TableForeignKey({
          name: foreignKey.name,
          columnNames: ['torneo_id'],
          referencedTableName: 'torneos',
          referencedColumnNames: ['id'],
          onDelete,
          onUpdate: 'NO ACTION',
        }),
      );
    }
  }
}
