import { QueryFailedError } from 'typeorm';

// La fila que se intenta borrar sigue referenciada por una clave foránea en MySQL.
export const isReferencedRow = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code ===
    'ER_ROW_IS_REFERENCED_2';
