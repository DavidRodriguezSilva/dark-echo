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
  /** Probabilidad de que el impacto arrastre burbuja, en [0, 1]. Rango declarado: 0.5 - 0.85. */
  bubbleProbability?: number;
  /**
   * Peso de la burbuja frente al impacto en la mezcla final, en [0, 1]. Por
   * defecto 0.5 (el reparto original, adecuado para gotas y burbujeo lento).
   * Para voces muy densas y de decaimiento muy corto, un peso alto produce
   * un tono senoidal que sube de tono y decae en milisegundos, disparado
   * decenas de veces por segundo -- perceptualmente indistinguible de un
   * efecto de laser (synthesis-reference, `impacto-gota`, nota sobre
   * `rain.impactos`). Bajarlo deja dominar el transitorio de ruido.
   */
  bubbleMix?: number;
  sampleRate: number;
}

export type DropVoice = () => number;

/**
 * Genera una unica voz de gota: al agotarse su duracion util devuelve 0. Cada
 * evento de gota crea una instancia nueva (ver domain, granulacion de
 * impactos).
 */
export function createDropVoice(rng: Rng, options: DropVoiceOptions): DropVoice {
  const {
    radiusMeters,
    bubbleDecaySeconds,
    pitchDrift,
    impactDurationSeconds,
    bubbleProbability = 1,
    bubbleMix = 0.5,
    sampleRate,
  } = options;

  // Se decide una sola vez, al crear la voz: no toda gota arrastra burbuja.
  const hasBubble = rng() < bubbleProbability;

  let elapsed = 0;
  let bubblePhase = 0;

  return () => {
    const t = elapsed;
    elapsed += 1 / sampleRate;

    const impactEnvelope =
      t < impactDurationSeconds ? Math.exp(-t / (impactDurationSeconds / 3)) : 0;
    const impact = whiteNoise(rng) * impactEnvelope;

    let bubble = 0;
    if (hasBubble) {
      const bubbleEnvelope = Math.exp(-t / (bubbleDecaySeconds / 3));
      const instantFrequency = bubbleInstantFrequency(
        radiusMeters,
        pitchDrift,
        bubbleDecaySeconds,
        t
      );
      bubblePhase += (2 * Math.PI * instantFrequency) / sampleRate;
      bubble = Math.sin(bubblePhase) * bubbleEnvelope;
    }

    return impact * (1 - bubbleMix) + bubble * bubbleMix;
  };
}
