import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const OLD_EQUIPO_FASE_FK = 'FK_equipos_fase_grupos_id_fases_id';
const NEW_EQUIPO_FASE_FK = 'FK_equipos_fase_grupos_id_fases_grupos_id';
const FASE_ORDEN_UNIQUE = 'UQ_fases_torneo_numero_orden';
// Nombre del indice que MySQL creo para la FK fases.torneo_id (migracion 0001).
const FASE_TORNEO_FK_INDEX = 'FK_fases_torneo_id_torneos_id';

/**
 * Reemplaza la herencia de tabla unica de `fases` (columna discriminadora
 * `tipo`) por dos tablas con relacion 1:1 hacia `fases`:
 *   - fases_grupos  (cantidad_grupos, equipos_por_grupo)
 *   - fases_finales (numero_partidos, modalidad)
 * Copia los datos existentes segun `tipo`, hace que equipos.fase_grupos_id
 * apunte a fases_grupos.id y agrega UNIQUE(torneo_id, numero_orden) en fases.
 */
export class SplitFasesIntoOneToOneTables1794180000016
  implements MigrationInterface
{
  name = 'SplitFasesIntoOneToOneTables1794180000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.assertDatosMigrables(queryRunner);

    await queryRunner.query(`
      CREATE TABLE \`fases_grupos\` (
        \`id\` varchar(36) NOT NULL,
        \`fase_id\` varchar(36) NOT NULL,
        \`cantidad_grupos\` int NULL,
        \`equipos_por_grupo\` int NULL,
        UNIQUE INDEX \`UQ_fases_grupos_fase_id\` (\`fase_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_fases_grupos_fase_id_fases_id\` FOREIGN KEY (\`fase_id\`)
          REFERENCES \`fases\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`fases_finales\` (
        \`id\` varchar(36) NOT NULL,
        \`fase_id\` varchar(36) NOT NULL,
        \`numero_partidos\` int NULL,
        \`modalidad\` enum('PARTIDO_UNICO', 'IDA_Y_VUELTA') NULL,
        UNIQUE INDEX \`UQ_fases_finales_fase_id\` (\`fase_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_fases_finales_fase_id_fases_id\` FOREIGN KEY (\`fase_id\`)
          REFERENCES \`fases\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // Copia de datos segun el antiguo discriminador.
    await queryRunner.query(`
      INSERT INTO \`fases_grupos\` (\`id\`, \`fase_id\`, \`cantidad_grupos\`, \`equipos_por_grupo\`)
      SELECT UUID(), \`id\`, \`cantidad_grupos\`, \`equipos_por_grupo\`
      FROM \`fases\` WHERE \`tipo\` = 'GRUPOS'
    `);
    await queryRunner.query(`
      INSERT INTO \`fases_finales\` (\`id\`, \`fase_id\`, \`numero_partidos\`, \`modalidad\`)
      SELECT UUID(), \`id\`, \`numero_partidos\`, \`modalidad\`
      FROM \`fases\` WHERE \`tipo\` = 'FINAL'
    `);

    // equipos.fase_grupos_id pasa de apuntar a fases.id a fases_grupos.id.
    // Un equipo que apuntaba a una fase FINAL queda sin fase de grupos (NULL).
    await this.dropForeignKeyIfExists(queryRunner, 'equipos', OLD_EQUIPO_FASE_FK);
    await queryRunner.query(`
      UPDATE \`equipos\` e
      LEFT JOIN \`fases_grupos\` fg ON fg.\`fase_id\` = e.\`fase_grupos_id\`
      SET e.\`fase_grupos_id\` = fg.\`id\`
      WHERE e.\`fase_grupos_id\` IS NOT NULL
    `);
    await queryRunner.createForeignKey(
      'equipos',
      new TableForeignKey({
        name: NEW_EQUIPO_FASE_FK,
        columnNames: ['fase_grupos_id'],
        referencedTableName: 'fases_grupos',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
      }),
    );

    // fases queda solo con los datos comunes.
    await queryRunner.query(`
      ALTER TABLE \`fases\`
        DROP COLUMN \`tipo\`,
        DROP COLUMN \`cantidad_grupos\`,
        DROP COLUMN \`equipos_por_grupo\`,
        DROP COLUMN \`numero_partidos\`,
        DROP COLUMN \`modalidad\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`fases\`
      ADD UNIQUE INDEX \`${FASE_ORDEN_UNIQUE}\` (\`torneo_id\`, \`numero_orden\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // MySQL reutiliza el indice unico para la FK fases.torneo_id y descarta el
    // indice propio de la FK; hay que recrearlo antes de poder quitar el unico.
    const [indiceTorneo] = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fases'
        AND INDEX_NAME = '${FASE_TORNEO_FK_INDEX}'
    `)) as [{ total: string | number }];
    if (Number(indiceTorneo.total) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`fases\` ADD INDEX \`${FASE_TORNEO_FK_INDEX}\` (\`torneo_id\`)`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`fases\` DROP INDEX \`${FASE_ORDEN_UNIQUE}\``,
    );

    await queryRunner.query(`
      ALTER TABLE \`fases\`
        ADD \`tipo\` varchar(255) NULL,
        ADD \`cantidad_grupos\` int NULL,
        ADD \`equipos_por_grupo\` int NULL,
        ADD \`numero_partidos\` int NULL,
        ADD \`modalidad\` enum('PARTIDO_UNICO', 'IDA_Y_VUELTA') NULL
    `);
    await queryRunner.query(`
      UPDATE \`fases\` f
      INNER JOIN \`fases_grupos\` fg ON fg.\`fase_id\` = f.\`id\`
      SET f.\`tipo\` = 'GRUPOS',
          f.\`cantidad_grupos\` = fg.\`cantidad_grupos\`,
          f.\`equipos_por_grupo\` = fg.\`equipos_por_grupo\`
    `);
    await queryRunner.query(`
      UPDATE \`fases\` f
      INNER JOIN \`fases_finales\` ff ON ff.\`fase_id\` = f.\`id\`
      SET f.\`tipo\` = 'FINAL',
          f.\`numero_partidos\` = ff.\`numero_partidos\`,
          f.\`modalidad\` = ff.\`modalidad\`
    `);
    await queryRunner.query(
      'ALTER TABLE `fases` MODIFY `tipo` varchar(255) NOT NULL',
    );

    await this.dropForeignKeyIfExists(queryRunner, 'equipos', NEW_EQUIPO_FASE_FK);
    await queryRunner.query(`
      UPDATE \`equipos\` e
      LEFT JOIN \`fases_grupos\` fg ON fg.\`id\` = e.\`fase_grupos_id\`
      SET e.\`fase_grupos_id\` = fg.\`fase_id\`
      WHERE e.\`fase_grupos_id\` IS NOT NULL
    `);
    await queryRunner.createForeignKey(
      'equipos',
      new TableForeignKey({
        name: OLD_EQUIPO_FASE_FK,
        columnNames: ['fase_grupos_id'],
        referencedTableName: 'fases',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.dropTable('fases_finales');
    await queryRunner.dropTable('fases_grupos');
  }

  // Evita perder datos: falla antes de tocar nada si algo no se puede migrar.
  private async assertDatosMigrables(queryRunner: QueryRunner): Promise<void> {
    const [tiposInvalidos] = (await queryRunner.query(`
      SELECT COUNT(*) AS total FROM \`fases\`
      WHERE \`tipo\` IS NULL OR \`tipo\` NOT IN ('GRUPOS', 'FINAL')
    `)) as [{ total: string | number }];
    if (Number(tiposInvalidos.total) > 0) {
      throw new Error(
        'Hay fases con un tipo distinto de GRUPOS o FINAL. Corrija o elimine esas fases antes de ejecutar esta migracion.',
      );
    }

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
        'Hay fases repetidas con el mismo torneo_id y numero_orden. Elimine o corrija los duplicados antes de ejecutar esta migracion.',
      );
    }
  }

  private async dropForeignKeyIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    foreignKeyName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const foreignKey = table?.foreignKeys.find(
      (key) => key.name === foreignKeyName,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey(tableName, foreignKey);
    }
  }
}
