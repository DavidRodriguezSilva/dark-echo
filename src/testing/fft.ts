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
