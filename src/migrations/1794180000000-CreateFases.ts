import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFases1794180000000 implements MigrationInterface {
  name = 'CreateFases1794180000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`fases\` (
        \`id\` varchar(36) NOT NULL,
        \`tipo\` varchar(255) NOT NULL,
        \`numero_orden\` int NOT NULL,
        \`fecha_inicio\` date NOT NULL,
        \`fecha_fin\` date NOT NULL,
        \`estado\` enum('PENDIENTE', 'EN_CURSO', 'FINALIZADA') NOT NULL DEFAULT 'PENDIENTE',
        \`torneo_id\` varchar(36) NOT NULL,
        \`cantidad_grupos\` int NULL,
        \`equipos_por_grupo\` int NULL,
        \`numero_partidos\` int NULL,
        \`modalidad\` enum('PARTIDO_UNICO', 'IDA_Y_VUELTA') NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `fases`');
  }
}
