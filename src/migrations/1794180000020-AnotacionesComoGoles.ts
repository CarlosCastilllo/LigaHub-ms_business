import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const ANOTACION_EQUIPO_FK = 'FK_anotaciones_equipo_id_equipos_id';

/**
 * HU-GC-07: una anotación es un gol y el marcador se calcula a partir de
 * ellas.
 * - anotaciones.equipo_id: equipo al que se suma el gol (local o visitante),
 *   fijado al registrarlo para que el histórico no cambie si el jugador se
 *   traslada después.
 * - anotaciones.descripcion pasa a ser opcional.
 * - Se eliminan partidos.goles_local/goles_visitante (ya no se escriben a mano).
 *
 * Las anotaciones existentes toman el equipo del partido al que pertenece el
 * jugador; las que no se pueden asociar a ninguno de los dos equipos se
 * eliminan porque ya no cumplen las reglas de la HU.
 */
export class AnotacionesComoGoles1794180000020 implements MigrationInterface {
  name = 'AnotacionesComoGoles1794180000020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`anotaciones\`
        ADD \`equipo_id\` varchar(36) NULL
    `);

    await queryRunner.query(`
      UPDATE \`anotaciones\` a
        INNER JOIN \`partidos\` p ON p.\`id\` = a.\`partido_id\`
        INNER JOIN \`equipo_jugador\` ej
          ON ej.\`jugador_id\` = a.\`jugador_id\`
         AND ej.\`equipo_id\` IN (p.\`equipo_local_id\`, p.\`equipo_visitante_id\`)
      SET a.\`equipo_id\` = ej.\`equipo_id\`
    `);

    await queryRunner.query(
      'DELETE FROM `anotaciones` WHERE `equipo_id` IS NULL',
    );

    await queryRunner.query(`
      ALTER TABLE \`anotaciones\`
        MODIFY \`equipo_id\` varchar(36) NOT NULL,
        MODIFY \`descripcion\` varchar(255) NULL
    `);

    await queryRunner.createForeignKey(
      'anotaciones',
      new TableForeignKey({
        name: ANOTACION_EQUIPO_FK,
        columnNames: ['equipo_id'],
        referencedTableName: 'equipos',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE \`partidos\`
        DROP COLUMN \`goles_local\`,
        DROP COLUMN \`goles_visitante\`
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`partidos\`
        ADD \`goles_local\` int NOT NULL DEFAULT 0,
        ADD \`goles_visitante\` int NOT NULL DEFAULT 0
    `);

    // Se conserva el marcador calculado a partir de las anotaciones.
    await queryRunner.query(`
      UPDATE \`partidos\` p
      SET
        p.\`goles_local\` = (
          SELECT COUNT(*) FROM \`anotaciones\` a
          WHERE a.\`partido_id\` = p.\`id\` AND a.\`equipo_id\` = p.\`equipo_local_id\`
        ),
        p.\`goles_visitante\` = (
          SELECT COUNT(*) FROM \`anotaciones\` a
          WHERE a.\`partido_id\` = p.\`id\` AND a.\`equipo_id\` = p.\`equipo_visitante_id\`
        )
    `);

    await queryRunner.query(
      "UPDATE `anotaciones` SET `descripcion` = '' WHERE `descripcion` IS NULL",
    );

    await queryRunner.dropForeignKey('anotaciones', ANOTACION_EQUIPO_FK);
    await queryRunner.query(`
      ALTER TABLE \`anotaciones\`
        DROP COLUMN \`equipo_id\`,
        MODIFY \`descripcion\` varchar(255) NOT NULL
    `);
  }
}
