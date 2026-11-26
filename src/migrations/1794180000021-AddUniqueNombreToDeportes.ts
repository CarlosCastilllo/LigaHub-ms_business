import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueNombreToDeportes1794180000021
  implements MigrationInterface
{
  name = 'AddUniqueNombreToDeportes1794180000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    const repetidos = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT CONVERT(TRIM(\`nombre\`) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS \`nombre_normalizado\`
        FROM \`deportes\`
        GROUP BY \`nombre_normalizado\` HAVING COUNT(*) > 1
      ) AS repetidos
    `)) as [{ total: string | number }];
    if (Number(repetidos[0].total) > 0) {
      throw new Error(
        'Cannot add the unique nombre constraint while deportes share the same nombre (ignoring case, accents and surrounding spaces). Decide which deporte to keep, move its torneos, equipos and subdeportes, and reconcile those rows before running this migration.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`deportes\`
        MODIFY \`nombre\` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        ADD UNIQUE INDEX \`UQ_deportes_nombre\` (\`nombre\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`deportes\`
        DROP INDEX \`UQ_deportes_nombre\`,
        MODIFY \`nombre\` varchar(150) NOT NULL
    `);
  }
}
