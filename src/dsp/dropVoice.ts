import type { Rng } from "./prng";
import { whiteNoise } from "./noise";

/**
 * Voz de gota (synthesis-reference, `impacto-gota`): dos sonidos sucesivos,
 * el impacto y la burbuja arrastrada que resuena segun Minnaert.
 */

/**
 * Resonancia de Minnaert para una burbuja de aire en agua a presion
 * atmosferica: f0 (Hz) en funcion del radio (m).
 */
export function minnaertFrequency(radiusMeters: number): number {
  return 3.26 / radiusMeters;
}

/**
 * Frecuencia instantanea de la burbuja en el instante `t` (s) desde el
 * impacto: sube desde `f0` un `pitchDrift` relativo a medida que `t` avanza
 * hacia `bubbleDecaySeconds`, y se mantiene en el valor final despues.
 */
export function bubbleInstantFrequency(
  radiusMeters: number,
  pitchDrift: number,
  bubbleDecaySeconds: number,
  t: number
): number {
  const f0 = minnaertFrequency(radiusMeters);
  const progress = Math.min(Math.max(t / bubbleDecaySeconds, 0), 1);
  return f0 * (1 + pitchDrift * progress);
}

export interface DropVoiceOptions {
  /** Radio de la burbuja, en metros. Rango declarado: 0.0004 - 0.0025. */
  radiusMeters: number;
  /** Duracion del decaimiento de la burbuja, en segundos. */
  bubbleDecaySeconds: number;
  /** Deriva relativa de tono durante el decaimiento (p. ej. 0.05 = 5%). */
  pitchDrift: number;
  /** Duracion del transitorio de impacto, en segundos. */
  impactDurationSeconds: number;
  sampleRate: number;
}

export type DropVoice = () => number;

/**
 * Genera una unica voz de gota: al agotarse su duracion util devuelve 0. Cada
 * evento de gota crea una instancia nueva (ver domain, granulacion de
 * impactos).
 */
export function createDropVoice(rng: Rng, options: DropVoiceOptions): DropVoice {
  const { radiusMeters, bubbleDecaySeconds, pitchDrift, impactDurationSeconds, sampleRate } =
    options;

  let elapsed = 0;
  let bubblePhase = 0;

  return () => {
    const t = elapsed;
    elapsed += 1 / sampleRate;

    const impactEnvelope =
      t < impactDurationSeconds ? Math.exp(-t / (impactDurationSeconds / 3)) : 0;
    const impact = whiteNoise(rng) * impactEnvelope;

    const bubbleEnvelope = Math.exp(-t / (bubbleDecaySeconds / 3));
    const instantFrequency = bubbleInstantFrequency(
      radiusMeters,
      pitchDrift,
      bubbleDecaySeconds,
      t
    );
    bubblePhase += (2 * Math.PI * instantFrequency) / sampleRate;
    const bubble = Math.sin(bubblePhase) * bubbleEnvelope;

    return impact * 0.5 + bubble * 0.5;
  };
}
