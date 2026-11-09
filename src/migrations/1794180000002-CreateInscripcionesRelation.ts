import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class CreateInscripcionesRelation1794180000002
  implements MigrationInterface
{
  name = 'CreateInscripcionesRelation1794180000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`inscripciones\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_inscripcion\` date NOT NULL,
        \`estado\` enum('PENDIENTE', 'ACEPTADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
        \`equipo_id\` varchar(36) NOT NULL,
        \`torneo_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.createForeignKey(
      'inscripciones',
      new TableForeignKey({
        name: 'FK_inscripciones_torneo_id_torneos_id',
        columnNames: ['torneo_id'],
        referencedTableName: 'torneos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const inscripciones = await queryRunner.getTable('inscripciones');
    const foreignKey = inscripciones?.foreignKeys.find(
      (key) => key.name === 'FK_inscripciones_torneo_id_torneos_id',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('inscripciones', foreignKey);
    }
    await queryRunner.dropTable('inscripciones');
  }
}
