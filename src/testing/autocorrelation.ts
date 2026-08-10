/**
 * Ausencia de periodicidad verificable (design.md D8): la autocorrelacion de
 * ruido en bruto es casi nula aunque la estructura se repita -- la
 * repeticion se manifiesta en la envolvente de energia, no en la muestra a
 * muestra. Por eso se autocorrela la envolvente RMS en ventanas cortas, no
 * la senal en crudo.
 */

/** Envolvente de energia RMS en ventanas de `windowSize` muestras, sin solape. */
export function rmsEnvelope(signal: ArrayLike<number>, windowSize: number): Float64Array {
  const numWindows = Math.floor(signal.length / windowSize);
  const envelope = new Float64Array(numWindows);

  for (let w = 0; w < numWindows; w++) {
    let sumSquares = 0;
    const start = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      const sample = signal[start + i];
      sumSquares += sample * sample;
    }
    envelope[w] = Math.sqrt(sumSquares / windowSize);
  }

  return envelope;
}

/**
 * Autocorrelacion normalizada de `signal`: 1 en el desplazamiento nulo,
 * decreciente segun cuanto se parezca la senal a si misma desplazada. Un
 * pico fuera de lag=0 por encima del umbral de periodicidad indica un ciclo.
 */
export function normalizedAutocorrelation(signal: ArrayLike<number>): Float64Array {
  const n = signal.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += signal[i];
  mean /= n;

  const centered = new Float64Array(n);
  for (let i = 0; i < n; i++) centered[i] = signal[i] - mean;

  let variance = 0;
  for (let i = 0; i < n; i++) variance += centered[i] * centered[i];

  const result = new Float64Array(n);
  if (variance === 0) return result;

  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += centered[i] * centered[i + lag];
    }
    result[lag] = sum / variance;
  }

  return result;
}

/** Mayor pico de autocorrelacion en |valor|, ignorando el desplazamiento nulo. */
export function maxPeakExcludingZeroLag(autocorrelation: Float64Array, minLag = 1): number {
  let max = 0;
  for (let lag = minLag; lag < autocorrelation.length; lag++) {
    max = Math.max(max, Math.abs(autocorrelation[lag]));
  }
  return max;
}
