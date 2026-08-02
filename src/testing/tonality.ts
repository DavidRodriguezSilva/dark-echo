import { binFrequencyHz, magnitudeSpectrum } from "./fft";

/**
 * Tonalidad de una señal: relación entre el pico espectral más alto y la
 * mediana del espectro (utilidad de test, como `fft.ts`; nunca se usa desde
 * el runtime).
 *
 * Existe por un defecto real encontrado por escucha y no por ningún test: la
 * primera versión del banco resonante de `Occlusion` sonaba como un "arco
 * eléctrico" —seis resonadores de Q alto apiñados en menos de una octava,
 * excitados de forma continua, zumbando como uno solo—. Todos los tests de
 * señal existentes pasaban, porque medían *fracción de energía en banda*, y
 * un zumbido tonal dentro de la banda correcta la satisface igual de bien
 * que un ruido de banda ancha.
 *
 * Un ambiente procedural de este catálogo es ruido de banda ancha: su
 * espectro es irregular pero sin picos dominantes, así que esta relación se
 * mantiene baja. Un resonador de Q alto excitado sin pausa produce un pico
 * estrecho órdenes de magnitud por encima de la mediana. Eso es exactamente
 * lo que distingue "lluvia sobre un techo" de "un zumbido", y lo que ningún
 * otro criterio de `synthesis-reference` detecta.
 */
export function spectralPeakToMedian(
  signal: ArrayLike<number>,
  sampleRateHz: number,
  bandHz: [number, number] = [100, 8000],
  fftSize = 32768
): { ratio: number; peakHz: number } {
  if (signal.length < fftSize) {
    throw new Error(
      `spectralPeakToMedian: la senal (${signal.length} muestras) es mas corta que fftSize (${fftSize})`
    );
  }

  const start = Math.floor(signal.length / 2 - fftSize / 2);
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) window[i] = signal[start + i];

  const spectrum = magnitudeSpectrum(window);

  // La medida se restringe a una banda, y no es un detalle: sobre el espectro
  // completo, una pendiente espectral muy pronunciada -- como la que deja una
  // barrera, que cae 6 dB/octava a lo largo de nueve octavas -- ya produce por
  // si sola una relacion pico/mediana enorme, sin que haya ningun tono. Lo que
  // aqui interesa es un pico *estrecho dentro de la banda audible util*, asi
  // que la mediana se calcula sobre la misma banda que el pico.
  const [lowHz, highHz] = bandHz;
  const inBand: number[] = [];
  let peak = 0;
  let peakBin = 0;

  for (let bin = 1; bin < spectrum.length; bin++) {
    const frequency = binFrequencyHz(bin, fftSize, sampleRateHz);
    if (frequency < lowHz || frequency >= highHz) continue;
    inBand.push(spectrum[bin]);
    if (spectrum[bin] > peak) {
      peak = spectrum[bin];
      peakBin = bin;
    }
  }

  if (inBand.length === 0) {
    throw new Error("spectralPeakToMedian: la banda declarada no contiene bins");
  }

  inBand.sort((a, b) => a - b);
  const median = inBand[Math.floor(inBand.length / 2)] || 1e-12;

  return { ratio: peak / median, peakHz: binFrequencyHz(peakBin, fftSize, sampleRateHz) };
}
