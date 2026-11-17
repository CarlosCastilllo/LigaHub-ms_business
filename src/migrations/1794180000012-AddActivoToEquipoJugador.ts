import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivoToEquipoJugador1794180000012
  implements MigrationInterface
{
  name = 'AddActivoToEquipoJugador1794180000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    const repetidos = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT \`jugador_id\` FROM \`equipo_jugador\`
        GROUP BY \`jugador_id\` HAVING COUNT(*) > 1
      ) AS repetidos
    `)) as [{ total: string | number }];
    if (Number(repetidos[0].total) > 0) {
      throw new Error(
        'Cannot add the single active contract per jugador constraint while a jugador has several equipo_jugador rows: all of them would become active. Decide which contracts are already finished and reconcile those rows before running this migration.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`equipo_jugador\`
        ADD \`activo\` tinyint NOT NULL DEFAULT 1,
        ADD \`vigente\` tinyint GENERATED ALWAYS AS (IF(\`activo\` = 1, 1, NULL)) STORED,
        ADD UNIQUE INDEX \`UQ_equipo_jugador_jugador_vigente\` (\`jugador_id\`, \`vigente\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // MySQL pudo descartar el índice implícito de la FK de jugador_id al crear
    // el índice único; se recrea uno propio para poder eliminar este último.
    const indice = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'equipo_jugador'
        AND INDEX_NAME = 'IDX_equipo_jugador_jugador_id'
    `)) as [{ total: string | number }];
    if (Number(indice[0].total) === 0) {
      await queryRunner.query(
        'CREATE INDEX `IDX_equipo_jugador_jugador_id` ON `equipo_jugador` (`jugador_id`)',
      );
    }
    await queryRunner.query(`
      ALTER TABLE \`equipo_jugador\`
        DROP INDEX \`UQ_equipo_jugador_jugador_vigente\`,
        DROP COLUMN \`vigente\`,
        DROP COLUMN \`activo\`
    `);
  }
}
