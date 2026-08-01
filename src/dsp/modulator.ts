import type { Rng } from "./prng";
import { smoothRandom } from "./utils";

/**
 * Modulador compuesto (design.md D5). Sustituye al `lfo` de una sola
 * sinusoide, cuyo periodo es audible como ciclo. Combina tres osciladores de
 * periodos en proporciones inconmensurables entre si -- la suma nunca vuelve
 * a un estado identico -- con un paseo aleatorio filtrado, que aporta la
 * deriva no ciclica que ninguna suma de periodicas puede dar.
 */

// Multiplicadores irracionales fijos: la razon entre dos cualesquiera de
// estos numeros (o entre uno de ellos y 1) es irracional, luego los tres
// periodos derivados de un mismo periodo base son inconmensurables entre si.
const PERIOD_MULTIPLIERS = [1, Math.SQRT2, Math.sqrt(5)];

export interface ModulatorOptions {
  min: number;
  max: number;
  /** Periodo del primer oscilador, en segundos. Los otros se derivan de este. */
  basePeriodSeconds: number;
  /** Peso del paseo aleatorio frente a la suma de senoides, en [0, 1]. */
  randomWalkWeight?: number;
  /** Paso del paseo aleatorio por llamada (ver smoothRandom). */
  randomWalkStep?: number;
}

export type Modulator = (time: number) => number;

export function createModulator(rng: Rng, options: ModulatorOptions): Modulator {
  const { min, max, basePeriodSeconds, randomWalkWeight = 0.35, randomWalkStep = 0.01 } = options;

  let walk = 0;

  return (time: number) => {
    walk = smoothRandom(walk, rng, randomWalkStep);

    let sum = 0;
    for (const multiplier of PERIOD_MULTIPLIERS) {
      const period = basePeriodSeconds * multiplier;
      sum += Math.sin((2 * Math.PI * time) / period);
    }
    // Cada termino esta en [-1, 1]; la media tambien lo esta.
    const sines = sum / PERIOD_MULTIPLIERS.length;

    // Combinacion convexa de dos valores en [-1, 1]: el resultado permanece
    // en [-1, 1] sin necesidad de recortar.
    const combined = sines * (1 - randomWalkWeight) + walk * randomWalkWeight;
    const normalized = (combined + 1) / 2;

    return min + normalized * (max - min);
  };
}
