/**
 * FFT radix-2 (Cooley-Tukey, iterativa) como utilidad de test (design.md
 * D8): "unas decenas de lineas" en lugar de anadir una dependencia de
 * analisis. Solo se usa desde los tests de senal, nunca desde el runtime.
 */
export interface ComplexSignal {
  re: Float64Array;
  im: Float64Array;
}

export function fftRadix2(real: ArrayLike<number>): ComplexSignal {
  const n = real.length;
  if (n === 0 || (n & (n - 1)) !== 0) {
    throw new Error("fftRadix2 requiere una longitud potencia de 2");
  }

  const re = Float64Array.from(real);
  const im = new Float64Array(n);

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    const half = len / 2;

    for (let i = 0; i < n; i += len) {
      let curWr = 1;
      let curWi = 0;

      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * curWr - im[i + j + half] * curWi;
        const vIm = re[i + j + half] * curWi + im[i + j + half] * curWr;

        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;

        const nextWr = curWr * wr - curWi * wi;
        const nextWi = curWr * wi + curWi * wr;
        curWr = nextWr;
        curWi = nextWi;
      }
    }
  }

  return { re, im };
}

/** Espectro de magnitud (mitad util del espectro, hasta Nyquist). */
export function magnitudeSpectrum(real: ArrayLike<number>): Float64Array {
  const { re, im } = fftRadix2(real);
  const half = re.length / 2;
  const magnitudes = new Float64Array(half);

  for (let i = 0; i < half; i++) {
    magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }

  return magnitudes;
}

/** Frecuencia central (Hz) del bin `binIndex` de una FFT de tamano `fftSize`. */
export function binFrequencyHz(binIndex: number, fftSize: number, sampleRateHz: number): number {
  return (binIndex * sampleRateHz) / fftSize;
}

/**
 * Fraccion de la energia espectral de `signal` que cae dentro de
 * `[lowHz, highHz)`, medida sobre una ventana de `fftSize` muestras tomada
 * del centro de la senal (evita transitorios de arranque).
 */
export function fractionOfEnergyInBand(
  signal: ArrayLike<number>,
  sampleRateHz: number,
  [lowHz, highHz]: [number, number],
  fftSize = 131072
): number {
  if (signal.length < fftSize) {
    throw new Error(
      `fractionOfEnergyInBand: la senal (${signal.length} muestras) es mas corta que fftSize (${fftSize})`
    );
  }

  const start = Math.floor(signal.length / 2 - fftSize / 2);
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) window[i] = signal[start + i];

  const spectrum = magnitudeSpectrum(window);
  let total = 0;
  let inBand = 0;
  for (let bin = 0; bin < spectrum.length; bin++) {
    const energy = spectrum[bin] * spectrum[bin];
    total += energy;
    const freq = binFrequencyHz(bin, fftSize, sampleRateHz);
    if (freq >= lowHz && freq < highHz) inBand += energy;
  }
  return inBand / total;
}

/**
 * Pendiente del espectro de magnitud en dB/octava dentro de `[lowHz, highHz)`
 * (docs/synthesis-reference.md, `ruido-de-color`), por regresion lineal de
 * minimos cuadrados sobre `log2(frecuencia)` frente a `20 * log10(magnitud)`
 * — el criterio correcto para ruido de espectro completo, donde "fraccion de
 * energia en banda" no discrimina entre colores.
 */
export function spectralSlopeDbPerOctave(
  signal: ArrayLike<number>,
  sampleRateHz: number,
  [lowHz, highHz]: [number, number],
  fftSize = 131072
): number {
  if (signal.length < fftSize) {
    throw new Error(
      `spectralSlopeDbPerOctave: la senal (${signal.length} muestras) es mas corta que fftSize (${fftSize})`
    );
  }

  const start = Math.floor(signal.length / 2 - fftSize / 2);
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) window[i] = signal[start + i];

  const spectrum = magnitudeSpectrum(window);

  const logFrequencies: number[] = [];
  const magnitudesDb: number[] = [];
  for (let bin = 1; bin < spectrum.length; bin++) {
    const freq = binFrequencyHz(bin, fftSize, sampleRateHz);
    if (freq < lowHz || freq >= highHz) continue;
    const magnitude = spectrum[bin];
    if (magnitude <= 0) continue;
    logFrequencies.push(Math.log2(freq));
    magnitudesDb.push(20 * Math.log10(magnitude));
  }

  const n = logFrequencies.length;
  if (n < 2) {
    throw new Error("spectralSlopeDbPerOctave: la banda declarada no contiene suficientes bins");
  }

  const meanX = logFrequencies.reduce((a, b) => a + b, 0) / n;
  const meanY = magnitudesDb.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const dx = logFrequencies[i] - meanX;
    covariance += dx * (magnitudesDb[i] - meanY);
    variance += dx * dx;
  }

  return covariance / variance;
}
