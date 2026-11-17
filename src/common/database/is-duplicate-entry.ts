import { QueryFailedError } from 'typeorm';

// Violación de un índice único en MySQL (p. ej. dos solicitudes simultáneas).
export const isDuplicateEntry = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === 'ER_DUP_ENTRY';
