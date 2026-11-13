import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

type AccionFk = 'CASCADE' | 'NO ACTION';

interface ForeignKeyDef {
  table: string;
  column: string;
  referencedTable: string;
  onDelete: AccionFk;
}

// Llaves foraneas creadas por esta migracion, en el orden en que se crean.
const FOREIGN_KEYS: ForeignKeyDef[] = [
  // 1:N reflexiva Escenario -> sub-escenarios
  { table: 'escenarios', column: 'escenario_padre_id', referencedTable: 'escenarios', onDelete: 'NO ACTION' },
  // N:N Torneo <-> Escenario (segunda 1:N de la tabla intermedia escenarios_torneo)
  { table: 'escenarios_torneo', column: 'escenario_id', referencedTable: 'escenarios', onDelete: 'NO ACTION' },
  // 1:N Escenario -> Localidad
  { table: 'localidades', column: 'escenario_id', referencedTable: 'escenarios', onDelete: 'CASCADE' },
  // 1:N Escenario -> Partido
  { table: 'partidos', column: 'escenario_id', referencedTable: 'escenarios', onDelete: 'NO ACTION' },
  // N:N Aficionado <-> MetodoPago mediante metodos_pago_aficionado
  { table: 'metodos_pago_aficionado', column: 'aficionado_id', referencedTable: 'aficionados', onDelete: 'NO ACTION' },
  { table: 'metodos_pago_aficionado', column: 'metodo_pago_id', referencedTable: 'metodos_pago', onDelete: 'NO ACTION' },
  // N:N Aficionado <-> Partido mediante boletas + 1:N Localidad -> Boleta
  { table: 'boletas', column: 'aficionado_id', referencedTable: 'aficionados', onDelete: 'NO ACTION' },
  { table: 'boletas', column: 'partido_id', referencedTable: 'partidos', onDelete: 'NO ACTION' },
  { table: 'boletas', column: 'localidad_id', referencedTable: 'localidades', onDelete: 'NO ACTION' },
  // N:N Aficionado <-> Partido mediante apuestas + 1:N MetodoPagoAficionado -> Apuesta
  { table: 'apuestas', column: 'aficionado_id', referencedTable: 'aficionados', onDelete: 'NO ACTION' },
  { table: 'apuestas', column: 'partido_id', referencedTable: 'partidos', onDelete: 'NO ACTION' },
  { table: 'apuestas', column: 'metodo_pago_aficionado_id', referencedTable: 'metodos_pago_aficionado', onDelete: 'NO ACTION' },
  // 1:N Partido -> Anotacion
  { table: 'anotaciones', column: 'partido_id', referencedTable: 'partidos', onDelete: 'CASCADE' },
  // 1:1 Partido <-> Pelota (partido_id es UNIQUE en pelotas)
  { table: 'pelotas', column: 'partido_id', referencedTable: 'partidos', onDelete: 'NO ACTION' },
];

function foreignKeyName(fk: ForeignKeyDef): string {
  return `FK_${fk.table}_${fk.column}_${fk.referencedTable}_id`;
}

export class CreateEscenariosPartidosAficionados1794180000004
  implements MigrationInterface
{
  name = 'CreateEscenariosPartidosAficionados1794180000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`escenarios\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`direccion\` varchar(255) NOT NULL,
        \`capacidad\` int NOT NULL,
        \`escenario_padre_id\` varchar(36) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`localidades\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(100) NOT NULL,
        \`capacidad\` int NOT NULL,
        \`precio\` decimal(12,2) NOT NULL,
        \`escenario_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`partidos\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_hora\` datetime NOT NULL,
        \`estado\` enum('PROGRAMADO', 'EN_JUEGO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
        \`equipo_local_id\` varchar(36) NOT NULL,
        \`equipo_visitante_id\` varchar(36) NOT NULL,
        \`goles_local\` int NOT NULL DEFAULT 0,
        \`goles_visitante\` int NOT NULL DEFAULT 0,
        \`escenario_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`aficionados\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`documento\` varchar(20) NOT NULL,
        \`email\` varchar(150) NOT NULL,
        \`telefono\` varchar(20) NULL,
        UNIQUE INDEX \`UQ_aficionados_documento\` (\`documento\`),
        UNIQUE INDEX \`UQ_aficionados_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`metodos_pago\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(100) NOT NULL,
        \`tipo\` enum('TARJETA_CREDITO', 'TARJETA_DEBITO', 'BILLETERA_DIGITAL', 'PSE', 'EFECTIVO') NOT NULL,
        \`activo\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`UQ_metodos_pago_nombre\` (\`nombre\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`metodos_pago_aficionado\` (
        \`id\` varchar(36) NOT NULL,
        \`referencia\` varchar(30) NOT NULL,
        \`fecha_registro\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`predeterminado\` tinyint NOT NULL DEFAULT 0,
        \`estado\` enum('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
        \`aficionado_id\` varchar(36) NOT NULL,
        \`metodo_pago_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`boletas\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_compra\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`precio\` decimal(12,2) NOT NULL,
        \`estado\` enum('ACTIVA', 'USADA', 'ANULADA') NOT NULL DEFAULT 'ACTIVA',
        \`aficionado_id\` varchar(36) NOT NULL,
        \`partido_id\` varchar(36) NOT NULL,
        \`localidad_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`apuestas\` (
        \`id\` varchar(36) NOT NULL,
        \`fecha_apuesta\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`monto\` decimal(12,2) NOT NULL,
        \`pronostico\` enum('LOCAL', 'EMPATE', 'VISITANTE') NOT NULL,
        \`cuota\` decimal(6,2) NOT NULL,
        \`estado\` enum('PENDIENTE', 'GANADA', 'PERDIDA', 'ANULADA') NOT NULL DEFAULT 'PENDIENTE',
        \`aficionado_id\` varchar(36) NOT NULL,
        \`partido_id\` varchar(36) NOT NULL,
        \`metodo_pago_aficionado_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`anotaciones\` (
        \`id\` varchar(36) NOT NULL,
        \`minuto\` int NOT NULL,
        \`descripcion\` varchar(255) NOT NULL,
        \`partido_id\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // partido_id UNIQUE: un partido tiene a lo sumo una pelota (relacion 1:1).
    await queryRunner.query(`
      CREATE TABLE \`pelotas\` (
        \`id\` varchar(36) NOT NULL,
        \`marca\` varchar(80) NOT NULL,
        \`modelo\` varchar(80) NOT NULL,
        \`talla\` int NOT NULL,
        \`estado\` enum('NUEVA', 'USADA', 'DESGASTADA') NOT NULL DEFAULT 'NUEVA',
        \`partido_id\` varchar(36) NULL,
        UNIQUE INDEX \`UQ_pelotas_partido_id\` (\`partido_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // escenarios_torneo.escenario_id era un UUID suelto sin FK. Como la tabla
    // escenarios recien se crea, cualquier asignacion existente apunta a un
    // escenario inexistente y MySQL rechazaria la FK: se eliminan esas filas.
    await queryRunner.query(`
      DELETE et FROM \`escenarios_torneo\` et
      LEFT JOIN \`escenarios\` e ON e.\`id\` = et.\`escenario_id\`
      WHERE e.\`id\` IS NULL
    `);

    for (const fk of FOREIGN_KEYS) {
      await queryRunner.createForeignKey(
        fk.table,
        new TableForeignKey({
          name: foreignKeyName(fk),
          columnNames: [fk.column],
          referencedTableName: fk.referencedTable,
          referencedColumnNames: ['id'],
          onDelete: fk.onDelete,
          onUpdate: 'NO ACTION',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Las filas de escenarios_torneo eliminadas en up() no se restauran.
    for (const fk of [...FOREIGN_KEYS].reverse()) {
      const table = await queryRunner.getTable(fk.table);
      const foreignKey = table?.foreignKeys.find(
        (key) => key.name === foreignKeyName(fk),
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(fk.table, foreignKey);
      }
    }

    for (const table of [
      'pelotas',
      'anotaciones',
      'apuestas',
      'boletas',
      'metodos_pago_aficionado',
      'metodos_pago',
      'aficionados',
      'partidos',
      'localidades',
      'escenarios',
    ]) {
      await queryRunner.dropTable(table);
    }
  }
}
