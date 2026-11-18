import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueNombreToHabilidades1794180000013
  implements MigrationInterface
{
  name = 'AddUniqueNombreToHabilidades1794180000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    const repetidos = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT CONVERT(TRIM(\`nombre\`) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS \`nombre_normalizado\`
        FROM \`habilidades\`
        GROUP BY \`nombre_normalizado\` HAVING COUNT(*) > 1
      ) AS repetidos
    `)) as [{ total: string | number }];
    if (Number(repetidos[0].total) > 0) {
      throw new Error(
        'Cannot add the unique nombre constraint while habilidades share the same nombre (ignoring case, accents and surrounding spaces). Decide which habilidad to keep and reconcile those rows before running this migration.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`habilidades\`
        MODIFY \`nombre\` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        ADD UNIQUE INDEX \`UQ_habilidades_nombre\` (\`nombre\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`habilidades\`
        DROP INDEX \`UQ_habilidades_nombre\`,
        MODIFY \`nombre\` varchar(150) NOT NULL
    `);
  }
}
