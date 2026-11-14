import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const FOREIGN_KEYS = [
  {
    name: 'FK_deportes_deporte_padre_id_deportes_id',
    table: 'deportes',
    column: 'deporte_padre_id',
    referencedTable: 'deportes',
    onDelete: 'SET NULL',
  },
  {
    name: 'FK_torneos_deporte_id_deportes_id',
    table: 'torneos',
    column: 'deporte_id',
    referencedTable: 'deportes',
    onDelete: 'NO ACTION',
  },
  {
    name: 'FK_equipos_deportes_equipo_id_equipos_id',
    table: 'equipos-deportes',
    column: 'equipo_id',
    referencedTable: 'equipos',
    onDelete: 'NO ACTION',
  },
  {
    name: 'FK_equipos_deportes_deporte_id_deportes_id',
    table: 'equipos-deportes',
    column: 'deporte_id',
    referencedTable: 'deportes',
    onDelete: 'NO ACTION',
  },
] as const;

export class CreateDeportesAndEquiposDeportes1794180000008
  implements MigrationInterface
{
  name = 'CreateDeportesAndEquiposDeportes1794180000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`deportes\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`descripcion\` text NOT NULL,
        \`deporte_padre_id\` varchar(36) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`equipos-deportes\` (
        \`id\` varchar(36) NOT NULL,
        \`equipo_id\` varchar(36) NOT NULL,
        \`deporte_id\` varchar(36) NOT NULL,
        UNIQUE INDEX \`UQ_equipos_deportes_equipo_deporte\` (\`equipo_id\`, \`deporte_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    const orphanTorneos = (await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM \`torneos\` t
      LEFT JOIN \`deportes\` d ON d.\`id\` = t.\`deporte_id\`
      WHERE d.\`id\` IS NULL
    `)) as [{ total: string | number }];
    if (Number(orphanTorneos[0].total) > 0) {
      throw new Error(
        'Cannot add the tournament-to-sport foreign key while torneos reference missing deportes. Insert the referenced deportes and reconcile torneo.deporte_id values before running this migration.',
      );
    }

    for (const foreignKey of FOREIGN_KEYS) {
      await queryRunner.createForeignKey(
        foreignKey.table,
        new TableForeignKey({
          name: foreignKey.name,
          columnNames: [foreignKey.column],
          referencedTableName: foreignKey.referencedTable,
          referencedColumnNames: ['id'],
          onDelete: foreignKey.onDelete,
          onUpdate: 'NO ACTION',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const foreignKey of [...FOREIGN_KEYS].reverse()) {
      const table = await queryRunner.getTable(foreignKey.table);
      const existingForeignKey = table?.foreignKeys.find(
        (key) => key.name === foreignKey.name,
      );
      if (existingForeignKey) {
        await queryRunner.dropForeignKey(foreignKey.table, existingForeignKey);
      }
    }

    await queryRunner.dropTable('equipos-deportes');
    await queryRunner.dropTable('deportes');
  }
}
