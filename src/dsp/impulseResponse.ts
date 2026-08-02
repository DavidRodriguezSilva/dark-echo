import { BAND_CROSSOVER_HZ, type PerBand } from "./acoustics";
import { onePoleLowpassCoefficient } from "./coefficients";
import { whiteNoise } from "./noise";
import type { Rng } from "./prng";

/**
 * Generacion procedural de una respuesta al impulso (docs/synthesis-reference.md,
 * modelo `reverberacion-sabine`).
 *
 * El producto no reproduce audio grabado en ningun punto
 * (`procedural-ambiences`), asi que la reverberacion no puede usar una
 * respuesta al impulso medida en una sala real, que es la practica habitual
 * en un reverb por conveniencia. La respuesta se *sintetiza*: ruido blanco
 * sembrado, separado en tres bandas y multiplicado en cada una por su propia
 * envolvente de decaimiento exponencial, derivada del RT60 de esa banda por
 * la formula de Sabine. Eso conserva la propiedad que hace convincente a un
 * reverb -- una cola densa y sin patron -- sin introducir una grabacion.
 *
 * El decaimiento exponencial que cae 60 dB en RT60 segundos es
 * `exp(-6.9078 * t / RT60)`, porque `-60 dB` es un factor `10^-3` y
 * `ln(10^3) = 6.9078`.
 */

const DECAY_60_DB = Math.log(1000);

/** Cola minima que se genera cuando alguna banda declara RT60 muy corto, en s. */
const MIN_TAIL_SECONDS = 0.05;

export interface ImpulseResponseOptions {
  /** RT60 por banda, en segundos (ver `sabineReverbTimePerBand`). */
  reverbTimeSeconds: PerBand;
  sampleRate: number;
  /** Canales a generar; con 2, cada canal usa un flujo de ruido independiente. */
  channels?: number;
}

/**
 * Sintetiza la respuesta al impulso como un array de canales. Cada canal se
 * genera con su propio flujo de ruido, nunca desfasando o invirtiendo el
 * mismo flujo: la suma a mono de dos canales desfasados se cancela, y una
 * parte del uso previsto es el altavoz mono de un telefono
 * (synthesis-reference, "Criterios de imagen estereo").
 *
 * La salida se normaliza a energia unitaria para que el nivel del bus humedo
 * no dependa del RT60 declarado -- de lo contrario, un entorno mas
 * reverberante sonaria ademas mas fuerte, mezclando dos efectos distintos.
 */
export function generateImpulseResponse(
  rng: Rng,
  { reverbTimeSeconds, sampleRate, channels = 2 }: ImpulseResponseOptions
): Float32Array[] {
  const longestTail = Math.max(
    reverbTimeSeconds.low,
    reverbTimeSeconds.mid,
    reverbTimeSeconds.high,
    MIN_TAIL_SECONDS
  );
  const length = Math.max(1, Math.round(longestTail * sampleRate));

  const lowMidCoefficient = onePoleLowpassCoefficient(BAND_CROSSOVER_HZ.lowMid, sampleRate);
  const midHighCoefficient = onePoleLowpassCoefficient(BAND_CROSSOVER_HZ.midHigh, sampleRate);

  const result: Float32Array[] = [];

  for (let channel = 0; channel < channels; channel++) {
    const samples = new Float32Array(length);

    // Estado de los dos pasa-bajos de un polo que separan las tres bandas:
    // `low` es la salida del primero, `lowMid` la del segundo, y la banda
    // `high` es lo que queda al restar la segunda de la senal original.
    let low = 0;
    let lowMid = 0;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const source = whiteNoise(rng);

      low = low * lowMidCoefficient + source * (1 - lowMidCoefficient);
      lowMid = lowMid * midHighCoefficient + source * (1 - midHighCoefficient);

      const lowBand = low;
      const midBand = lowMid - low;
      const highBand = source - lowMid;

      samples[i] =
        lowBand * decayAt(t, reverbTimeSeconds.low) +
        midBand * decayAt(t, reverbTimeSeconds.mid) +
        highBand * decayAt(t, reverbTimeSeconds.high);
    }

    result.push(samples);
  }

  normalizeToUnitEnergy(result);
  return result;
}

/** Envolvente de decaimiento exponencial que cae 60 dB en `reverbTimeSeconds`. */
function decayAt(timeSeconds: number, reverbTimeSeconds: number): number {
  if (reverbTimeSeconds <= 0) return 0;
  return Math.exp((-DECAY_60_DB * timeSeconds) / reverbTimeSeconds);
}

/** Escala todos los canales por un mismo factor, preservando la relacion entre ellos. */
function normalizeToUnitEnergy(channels: Float32Array[]): void {
  let energy = 0;
  for (const samples of channels) {
    for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  }
  if (energy <= 0) return;

  const scale = 1 / Math.sqrt(energy);
  for (const samples of channels) {
    for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  }
}
