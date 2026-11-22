import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un usuario de ms-security puede convertirse en aficionado (HU-GE-05).
 * user_id es nullable: los aficionados registrados antes no tienen usuario.
 */
export class LinkAficionadosToUsers1794180000018 implements MigrationInterface {
  name = 'LinkAficionadosToUsers1794180000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`aficionados\`
        ADD \`user_id\` bigint NULL AFTER \`id\`,
        ADD UNIQUE INDEX \`UQ_aficionados_user_id\` (\`user_id\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`aficionados\`
        DROP INDEX \`UQ_aficionados_user_id\`,
        DROP COLUMN \`user_id\`
    `);
  }
}
