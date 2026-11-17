import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkJugadoresToUsers1794180000011 implements MigrationInterface {
  name = 'LinkJugadoresToUsers1794180000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    const existentes = (await queryRunner.query(
      'SELECT COUNT(*) AS total FROM `jugadores`',
    )) as [{ total: string | number }];
    if (Number(existentes[0].total) > 0) {
      throw new Error(
        'Cannot link jugadores to users while jugadores exist: each jugador needs the user_id of its ms-security user and it cannot be inferred. Remove or migrate those jugadores before running this migration.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`jugadores\`
        DROP COLUMN \`nombres\`,
        DROP COLUMN \`apellidos\`,
        ADD \`user_id\` bigint NOT NULL,
        ADD \`activo\` tinyint NOT NULL DEFAULT 1,
        ADD UNIQUE INDEX \`UQ_jugadores_user_id\` (\`user_id\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`jugadores\`
        DROP INDEX \`UQ_jugadores_user_id\`,
        DROP COLUMN \`activo\`,
        DROP COLUMN \`user_id\`,
        ADD \`nombres\` varchar(100) NOT NULL DEFAULT '',
        ADD \`apellidos\` varchar(100) NOT NULL DEFAULT ''
    `);
  }
}
