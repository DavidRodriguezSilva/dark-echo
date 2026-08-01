import type { Rng } from "./prng";

/**
 * Envolvente periodica asimetrica (synthesis-reference, `oleaje`): asciende
 * mas rapido de lo que desciende -- lo que distingue una ola de un LFO
 * sinusoidal simetrico (design.md D3). Cada ciclo usa medio coseno tanto en
 * el ascenso como en el descenso, para llegar suave a la cresta y al valle
 * (derivada nula en ambos extremos, sin discontinuidad de pendiente).
 *
 * El periodo de cada ciclo se sortea con una pequena variacion aleatoria
 * (`periodJitter`) para que el oleaje no repita un ciclo idéntico una y otra
 * vez -- la asimetria por si sola no basta para la no periodicidad si el
 * periodo es exactamente constante.
 */
export interface AsymmetricEnvelopeOptions {
  min: number;
  max: number;
  /** Periodo nominal de un ciclo, en segundos. */
  periodSeconds: number;
  /** Fraccion del periodo que ocupa el ascenso, en (0, 1). Ver doc, k_a. */
  riseFraction: number;
  /** Variacion aleatoria del periodo por ciclo, en [0, 1] (0 = fijo). */
  periodJitter?: number;
  sampleRate: number;
}

export type AsymmetricEnvelope = () => number;

function easeHalfCosine(t: number): number {
  return (1 - Math.cos(Math.PI * t)) / 2;
}

export function createAsymmetricEnvelope(
  rng: Rng,
  options: AsymmetricEnvelopeOptions
): AsymmetricEnvelope {
  const { min, max, periodSeconds, riseFraction, periodJitter = 0.2, sampleRate } = options;

  const jitteredPeriod = () => periodSeconds * (1 + (rng() * 2 - 1) * periodJitter);

  let elapsedInCycle = 0;
  let currentPeriod = jitteredPeriod();

  return () => {
    const riseSeconds = currentPeriod * riseFraction;
    const fallSeconds = currentPeriod - riseSeconds;

    let normalized: number;
    if (elapsedInCycle < riseSeconds) {
      normalized = easeHalfCosine(elapsedInCycle / riseSeconds);
    } else {
      normalized = 1 - easeHalfCosine((elapsedInCycle - riseSeconds) / fallSeconds);
    }

    elapsedInCycle += 1 / sampleRate;
    if (elapsedInCycle >= currentPeriod) {
      elapsedInCycle -= currentPeriod;
      currentPeriod = jitteredPeriod();
    }

    return min + normalized * (max - min);
  };
}
