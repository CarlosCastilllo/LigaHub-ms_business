import { MigrationInterface, QueryRunner } from 'typeorm';

const FASE_ORDEN_UNIQUE = 'UQ_fases_torneo_numero_orden';
// Indice propio de la FK fases.torneo_id (migracion 0001).
const FASE_TORNEO_FK_INDEX = 'FK_fases_torneo_id_torneos_id';

/**
 * - fases: numero_orden deja de ser unico por torneo (varios grupos pueden
 *   compartir la misma etapa).
 * - fases_grupos pasa a representar UN grupo:
 *     + nombre (los grupos existentes quedan como "Grupo <numero_orden>")
 *     equipos_por_grupo -> cupo_equipos (se conservan los datos)
 *     - cantidad_grupos
 */
export class GruposAsGrupoAndNonUniqueOrden1794180000017 implements MigrationInterface {
  name = 'GruposAsGrupoAndNonUniqueOrden1794180000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    // MySQL usa el indice unico para la FK torneo_id: hay que asegurar un
    // indice propio para la FK antes de poder quitar el unico.
    await this.ensureTorneoFkIndex(queryRunner);
    if (await this.indexExists(queryRunner, FASE_ORDEN_UNIQUE)) {
      await queryRunner.query(
        `ALTER TABLE \`fases\` DROP INDEX \`${FASE_ORDEN_UNIQUE}\``,
      );
    }

    await queryRunner.query(
      'ALTER TABLE `fases_grupos` ADD `nombre` varchar(100) NULL AFTER `id`',
    );
    await queryRunner.query(`
      UPDATE \`fases_grupos\` fg
      INNER JOIN \`fases\` f ON f.\`id\` = fg.\`fase_id\`
      SET fg.\`nombre\` = CONCAT('Grupo ', f.\`numero_orden\`)
    `);
    await queryRunner.query(
      'ALTER TABLE `fases_grupos` MODIFY `nombre` varchar(100) NOT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE `fases_grupos` CHANGE `equipos_por_grupo` `cupo_equipos` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `fases_grupos` DROP COLUMN `cantidad_grupos`',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [repetidas] = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT \`torneo_id\`, \`numero_orden\`
        FROM \`fases\`
        GROUP BY \`torneo_id\`, \`numero_orden\`
        HAVING COUNT(*) > 1
      ) AS repetidas
    `)) as [{ total: string | number }];
    if (Number(repetidas.total) > 0) {
      throw new Error(
        'Hay fases con el mismo torneo_id y numero_orden. Corrija los duplicados antes de revertir esta migracion.',
      );
    }

    await queryRunner.query(
      'ALTER TABLE `fases_grupos` ADD `cantidad_grupos` int NULL AFTER `fase_id`',
    );
    await queryRunner.query(
      'ALTER TABLE `fases_grupos` CHANGE `cupo_equipos` `equipos_por_grupo` int NULL',
    );
    await queryRunner.query('ALTER TABLE `fases_grupos` DROP COLUMN `nombre`');

    await queryRunner.query(`
      ALTER TABLE \`fases\`
      ADD UNIQUE INDEX \`${FASE_ORDEN_UNIQUE}\` (\`torneo_id\`, \`numero_orden\`)
    `);
  }

  private async ensureTorneoFkIndex(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.indexExists(queryRunner, FASE_TORNEO_FK_INDEX))) {
      await queryRunner.query(
        `ALTER TABLE \`fases\` ADD INDEX \`${FASE_TORNEO_FK_INDEX}\` (\`torneo_id\`)`,
      );
    }
  }

  private async indexExists(
    queryRunner: QueryRunner,
    indexName: string,
  ): Promise<boolean> {
    const [row] = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fases'
         AND INDEX_NAME = ?`,
      [indexName],
    )) as [{ total: string | number }];
    return Number(row.total) > 0;
  }
}
