import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class CreateEscenariosTorneoRelation1794180000003
  implements MigrationInterface
{
  name = 'CreateEscenariosTorneoRelation1794180000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`escenarios_torneo\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_asignacion\` date NOT NULL,
        \`estado\` enum('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
        \`escenario_id\` varchar(36) NOT NULL,
        \`torneo_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.createForeignKey(
      'escenarios_torneo',
      new TableForeignKey({
        name: 'FK_escenarios_torneo_torneo_id_torneos_id',
        columnNames: ['torneo_id'],
        referencedTableName: 'torneos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('escenarios_torneo');
    const foreignKey = table?.foreignKeys.find(
      (key) => key.name === 'FK_escenarios_torneo_torneo_id_torneos_id',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('escenarios_torneo', foreignKey);
    }
    await queryRunner.dropTable('escenarios_torneo');
  }
}
