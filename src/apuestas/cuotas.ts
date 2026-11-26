import { PronosticoApuesta } from './entities/apuesta.entity';

/**
 * HU-C: cuota fija por pronóstico para las apuestas del aficionado. La fija
 * el servidor; el aficionado la ve antes de apostar y no puede cambiarla.
 */
export const CUOTAS_POR_PRONOSTICO: Readonly<Record<PronosticoApuesta, number>> =
  Object.freeze({
    [PronosticoApuesta.LOCAL]: 2.0,
    [PronosticoApuesta.EMPATE]: 3.0,
    [PronosticoApuesta.VISITANTE]: 2.5,
  });

export function gananciaPotencial(monto: number, cuota: number): number {
  return Math.round(monto * cuota * 100) / 100;
}
