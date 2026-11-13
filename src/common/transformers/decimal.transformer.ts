import type { ValueTransformer } from 'typeorm';

// mysql2 devuelve las columnas DECIMAL como string; se convierten a number.
export const decimalToNumber: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
