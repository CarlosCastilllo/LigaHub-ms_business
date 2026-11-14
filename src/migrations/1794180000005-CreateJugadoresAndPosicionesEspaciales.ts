import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const ANOTACION_JUGADOR_FK =
  'FK_anotaciones_jugador_id_jugadores_id';
const POSICION_JUGADOR_FK =
  'FK_posiciones_espaciales_jugador_id_jugadores_id';
const POSICION_PELOTA_FK =
  'FK_posiciones_espaciales_pelota_id_pelotas_id';

export class CreateJugadoresAndPosicionesEspaciales1794180000005
  implements MigrationInterface
{
  name = 'CreateJugadoresAndPosicionesEspaciales1794180000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [anotacionesResult] = (await queryRunner.query(
      'SELECT COUNT(*) AS total FROM `anotaciones`',
    )) as [{ total: string | number }];
    if (Number(anotacionesResult.total) > 0) {
      throw new Error(
        'Cannot add required anotaciones.jugador_id while anotaciones already exist. Assign each existing anotacion to a jugador before running this migration.',
      );
    }

    await queryRunner.query(`
      CREATE TABLE \`jugadores\` (
        \`id\` varchar(36) NOT NULL,
        \`nombres\` varchar(100) NOT NULL,
        \`apellidos\` varchar(100) NOT NULL,
        \`fecha_nacimiento\` date NOT NULL,
        \`nacionalidad\` varchar(100) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`anotaciones\`
      ADD \`jugador_id\` varchar(36) NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`posiciones_espaciales\` (
        \`id\` varchar(36) NOT NULL,
        \`x\` double NOT NULL,
        \`y\` double NOT NULL,
        \`tiempo_segundos\` int NOT NULL,
        \`jugador_id\` varchar(36) NULL,
        \`pelota_id\` varchar(36) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.createForeignKey(
      'anotaciones',
      new TableForeignKey({
        name: ANOTACION_JUGADOR_FK,
        columnNames: ['jugador_id'],
        referencedTableName: 'jugadores',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKeys('posiciones_espaciales', [
      new TableForeignKey({
        name: POSICION_JUGADOR_FK,
        columnNames: ['jugador_id'],
        referencedTableName: 'jugadores',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: POSICION_PELOTA_FK,
        columnNames: ['pelota_id'],
        referencedTableName: 'pelotas',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const posicionesTable = await queryRunner.getTable(
      'posiciones_espaciales',
    );
    if (posicionesTable) {
      const positionForeignKeys = posicionesTable.foreignKeys.filter((key) =>
        [POSICION_JUGADOR_FK, POSICION_PELOTA_FK].includes(key.name ?? ''),
      );
      if (positionForeignKeys.length > 0) {
        await queryRunner.dropForeignKeys(
          'posiciones_espaciales',
          positionForeignKeys,
        );
      }
      await queryRunner.dropTable('posiciones_espaciales');
    }

    const anotacionesTable = await queryRunner.getTable('anotaciones');
    const anotacionJugadorForeignKey = anotacionesTable?.foreignKeys.find(
      (key) => key.name === ANOTACION_JUGADOR_FK,
    );
    if (anotacionJugadorForeignKey) {
      await queryRunner.dropForeignKey(
        'anotaciones',
        anotacionJugadorForeignKey,
      );
    }
    if (anotacionesTable?.findColumnByName('jugador_id')) {
      await queryRunner.dropColumn('anotaciones', 'jugador_id');
    }

    await queryRunner.dropTable('jugadores');
  }
}
