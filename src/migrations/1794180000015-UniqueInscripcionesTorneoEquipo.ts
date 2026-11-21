import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueInscripcionesTorneoEquipo1794180000015
  implements MigrationInterface
{
  name = 'UniqueInscripcionesTorneoEquipo1794180000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    const repetidas = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT \`torneo_id\`, \`equipo_id\`
        FROM \`inscripciones\`
        GROUP BY \`torneo_id\`, \`equipo_id\`
        HAVING COUNT(*) > 1
      ) AS repetidas
    `)) as [{ total: string | number }];
    if (Number(repetidas[0].total) > 0) {
      throw new Error(
        'Cannot add the unique tournament-team constraint while duplicate inscripciones exist. Reconcile duplicate rows before running this migration.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`inscripciones\`
      ADD UNIQUE INDEX \`UQ_inscripciones_torneo_equipo\` (\`torneo_id\`, \`equipo_id\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`inscripciones\`
      DROP INDEX \`UQ_inscripciones_torneo_equipo\`
    `);
  }
}
