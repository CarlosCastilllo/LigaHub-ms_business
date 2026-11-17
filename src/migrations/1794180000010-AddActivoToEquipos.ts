import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivoToEquipos1794180000010 implements MigrationInterface {
  name = 'AddActivoToEquipos1794180000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `equipos` ADD `activo` tinyint NOT NULL DEFAULT 1',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `equipos` DROP COLUMN `activo`');
  }
}
