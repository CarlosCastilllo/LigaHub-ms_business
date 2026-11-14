import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const FOREIGN_KEYS = [
  {
    name: 'FK_habilidad_jugador_habilidad_id_habilidades_id',
    table: 'habilidad-jugador',
    column: 'habilidad_id',
    referencedTable: 'habilidades',
  },
  {
    name: 'FK_habilidad_jugador_jugador_id_jugadores_id',
    table: 'habilidad-jugador',
    column: 'jugador_id',
    referencedTable: 'jugadores',
  },
] as const;

export class CreateHabilidadesAndHabilidadJugador1794180000007
  implements MigrationInterface
{
  name = 'CreateHabilidadesAndHabilidadJugador1794180000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`habilidades\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`descripcion\` text NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`habilidad-jugador\` (
        \`id\` varchar(36) NOT NULL,
        \`habilidad_id\` varchar(36) NOT NULL,
        \`jugador_id\` varchar(36) NOT NULL,
        UNIQUE INDEX \`UQ_habilidad_jugador_habilidad_jugador\` (\`habilidad_id\`, \`jugador_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    for (const foreignKey of FOREIGN_KEYS) {
      await queryRunner.createForeignKey(
        foreignKey.table,
        new TableForeignKey({
          name: foreignKey.name,
          columnNames: [foreignKey.column],
          referencedTableName: foreignKey.referencedTable,
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
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

    await queryRunner.dropTable('habilidad-jugador');
    await queryRunner.dropTable('habilidades');
  }
}
