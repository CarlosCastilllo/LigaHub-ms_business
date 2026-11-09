import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateTorneosAndRelateFases1794180000001 implements MigrationInterface {
  name = 'CreateTorneosAndRelateFases1794180000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'torneos',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'nombre',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          { name: 'descripcion', type: 'text', isNullable: false },
          {
            name: 'estado',
            type: 'enum',
            enum: ['PENDIENTE', 'EN_CURSO', 'FINALIZADO'],
            default: "'PENDIENTE'",
            isNullable: false,
          },
          { name: 'max_equipos', type: 'int', isNullable: false },
          {
            name: 'deporte_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'fases',
      new TableForeignKey({
        name: 'FK_fases_torneo_id_torneos_id',
        columnNames: ['torneo_id'],
        referencedTableName: 'torneos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const fases = await queryRunner.getTable('fases');
    const foreignKey = fases?.foreignKeys.find(
      (key) => key.name === 'FK_fases_torneo_id_torneos_id',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('fases', foreignKey);
    }
    await queryRunner.dropTable('torneos');
  }
}
