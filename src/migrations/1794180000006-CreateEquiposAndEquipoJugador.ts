import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

const FOREIGN_KEYS = [
  {
    name: 'FK_equipo_jugador_equipo_id_equipos_id',
    table: 'equipo_jugador',
    column: 'equipo_id',
    referencedTable: 'equipos',
  },
  {
    name: 'FK_equipo_jugador_jugador_id_jugadores_id',
    table: 'equipo_jugador',
    column: 'jugador_id',
    referencedTable: 'jugadores',
  },
  {
    name: 'FK_inscripciones_equipo_id_equipos_id',
    table: 'inscripciones',
    column: 'equipo_id',
    referencedTable: 'equipos',
  },
  {
    name: 'FK_partidos_equipo_local_id_equipos_id',
    table: 'partidos',
    column: 'equipo_local_id',
    referencedTable: 'equipos',
  },
  {
    name: 'FK_partidos_equipo_visitante_id_equipos_id',
    table: 'partidos',
    column: 'equipo_visitante_id',
    referencedTable: 'equipos',
  },
  {
    name: 'FK_equipos_fase_grupos_id_fases_id',
    table: 'equipos',
    column: 'fase_grupos_id',
    referencedTable: 'fases',
    onDelete: 'SET NULL',
  },
  {
    name: 'FK_aficionados_equipos_aficionado_id_aficionados_id',
    table: 'aficionados_equipos',
    column: 'aficionado_id',
    referencedTable: 'aficionados',
  },
  {
    name: 'FK_aficionados_equipos_equipo_id_equipos_id',
    table: 'aficionados_equipos',
    column: 'equipo_id',
    referencedTable: 'equipos',
  },
] as const;

export class CreateEquiposAndEquipoJugador1794180000006
  implements MigrationInterface
{
  name = 'CreateEquiposAndEquipoJugador1794180000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [inscripcionesResult] = (await queryRunner.query(
      'SELECT COUNT(*) AS total FROM `inscripciones`',
    )) as [{ total: string | number }];
    const [partidosResult] = (await queryRunner.query(
      'SELECT COUNT(*) AS total FROM `partidos`',
    )) as [{ total: string | number }];
    if (
      Number(inscripcionesResult.total) > 0 ||
      Number(partidosResult.total) > 0
    ) {
      throw new Error(
        'Cannot add Equipo foreign keys while inscripciones or partidos already exist. Reconcile those existing records before running this migration; their team names cannot be inferred safely.',
      );
    }

    await queryRunner.query(`
      CREATE TABLE \`equipos\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`fase_grupos_id\` varchar(36) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`equipo_jugador\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_inicio\` date NOT NULL,
        \`fecha_fin\` date NULL,
        \`equipo_id\` varchar(36) NOT NULL,
        \`jugador_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`aficionados_equipos\` (
        \`id\` varchar(36) NOT NULL,
        \`aficionado_id\` varchar(36) NOT NULL,
        \`equipo_id\` varchar(36) NOT NULL,
        UNIQUE INDEX \`UQ_aficionados_equipos_aficionado_equipo\` (\`aficionado_id\`, \`equipo_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    for (const foreignKey of FOREIGN_KEYS) {
      await queryRunner.createForeignKey(
        foreignKey.table,
        new TableForeignKey({
          name: foreignKey.name,
          columnNames: [foreignKey.column],
          referencedTableName: foreignKey.referencedTable,
          referencedColumnNames: ['id'],
          onDelete:
            'onDelete' in foreignKey ? foreignKey.onDelete : 'NO ACTION',
          onUpdate: 'NO ACTION',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const foreignKey of [...FOREIGN_KEYS].reverse()) {
      const table = await queryRunner.getTable(foreignKey.table);
      const existingForeignKey = table?.foreignKeys.find(
        (key) => key.name === foreignKey.name,
      );
      if (existingForeignKey) {
        await queryRunner.dropForeignKey(foreignKey.table, existingForeignKey);
      }
    }

    await queryRunner.dropTable('aficionados_equipos');
    await queryRunner.dropTable('equipo_jugador');
    await queryRunner.dropTable('equipos');
  }
}
