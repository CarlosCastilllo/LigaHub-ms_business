import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class InscripcionesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countByTorneo(torneoId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS total_inscripciones
       FROM inscripciones
       WHERE torneo_id = ?`,
      [torneoId],
    );
    return Number(row.total_inscripciones);
  }
}
