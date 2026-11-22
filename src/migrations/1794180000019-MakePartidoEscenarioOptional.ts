import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-06: el escenario se asocia al partido "cuando corresponda", así que
 * un partido puede registrarse sin escenario y recibirlo después.
 * La FK a escenarios se conserva; solo cambia la nulabilidad de la columna.
 */
export class MakePartidoEscenarioOptional1794180000019
  implements MigrationInterface
{
  name = 'MakePartidoEscenarioOptional1794180000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`partidos\`
        MODIFY \`escenario_id\` varchar(36) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = (await queryRunner.query(
      'SELECT COUNT(*) AS total FROM `partidos` WHERE `escenario_id` IS NULL',
    )) as Array<{ total: string | number }>;
    if (Number(total) > 0) {
      throw new Error(
        'Hay partidos sin escenario: asígneles uno antes de revertir esta migración',
      );
    }
    await queryRunner.query(`
      ALTER TABLE \`partidos\`
        MODIFY \`escenario_id\` varchar(36) NOT NULL
    `);
  }
}
