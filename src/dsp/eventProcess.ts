import type { Rng } from "./prng";

/**
 * Generador de eventos esporadicos como proceso de Poisson sembrado
 * (procedural-ambiences, "Eventos discretos esporadicos"): los intervalos
 * entre ocurrencias se distribuyen exponencialmente, nunca a intervalo fijo.
 */

export interface PoissonEventsOptions {
  /** Tasa media del proceso, en eventos por segundo. */
  rateHz: number;
}

export type PoissonEvents = () => number;

/**
 * Devuelve una funcion que, en cada llamada, produce el siguiente intervalo
 * hasta la proxima ocurrencia (en segundos), muestreado de una distribucion
 * exponencial de media `1 / rateHz`.
 */
export function createPoissonEvents(rng: Rng, options: PoissonEventsOptions): PoissonEvents {
  const { rateHz } = options;

  return () => {
    // Muestreo por transformada inversa de una exponencial: -ln(U) / rate,
    // con U uniforme en (0, 1]. rng() puede devolver 0; se evita log(0).
    const u = Math.max(rng(), Number.EPSILON);
    return -Math.log(u) / rateHz;
  };
}
