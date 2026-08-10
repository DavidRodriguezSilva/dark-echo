import { mulberry32, type Rng } from "../../dsp/prng";
import { createDropVoice, type DropVoice } from "../../dsp/dropVoice";
import { createPoissonEvents } from "../../dsp/eventProcess";

interface ActiveVoice {
  next: DropVoice;
  pan: number;
  framesRemaining: number;
}

interface DenseGranularOptions {
  seed?: number;
  /** Densidad media de disparos, en eventos por segundo. */
  rateHz?: number;
  /** Rango de radios de burbuja, en metros (synthesis-reference, impacto-gota). */
  radiusRange?: [number, number];
  bubbleDecayRange?: [number, number];
  pitchDrift?: number;
  impactDurationRange?: [number, number];
  /** Probabilidad de que el impacto arrastre burbuja. Rango declarado: 0.5 - 0.85. */
  bubbleProbability?: number;
  bubbleMix?: number;
  /** Centro de banda del transitorio de impacto, en Hz (`impacto-gota`, `f_i`). */
  impactBandHz?: number;
  impactQ?: number;
  /** Cuanto se mantiene una voz activa como maximo, en segundos. */
  voiceLifetimeSeconds?: number;
  maxVoices?: number;
}

function sampleRange(rng: Rng, [min, max]: [number, number]): number {
  return min + rng() * (max - min);
}

/**
 * Granulacion densa de eventos discretos (design.md D2): decenas o cientos
 * de voces de gota por segundo son inviables de planificar desde el hilo
 * principal, asi que el worklet mantiene su propio reloj de muestras y su
 * propio banco de voces, disparando nuevas instancias de `DropVoice`
 * (synthesis-reference, impacto-gota) segun un proceso de Poisson sembrado.
 *
 * Cada disparo recibe una posicion distinta del campo estereo (D16): las
 * gotas de lluvia no deben percibirse cayendo siempre en el mismo punto.
 */
class DenseGranularProcessor extends AudioWorkletProcessor {
  private readonly rng: Rng;
  private readonly nextInterval: () => number;
  private readonly radiusRange: [number, number];
  private readonly bubbleDecayRange: [number, number];
  private readonly pitchDrift: number;
  private readonly impactDurationRange: [number, number];
  private readonly bubbleProbability: number;
  private readonly bubbleMix: number | undefined;
  private readonly impactBandHz: number | undefined;
  private readonly impactQ: number | undefined;
  private readonly voiceLifetimeFrames: number;
  private readonly maxVoices: number;

  private readonly voices: ActiveVoice[] = [];
  private framesUntilNextEvent: number;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    const data = (options?.processorOptions ?? {}) as DenseGranularOptions;
    this.rng = mulberry32(data.seed ?? 1);
    this.radiusRange = data.radiusRange ?? [0.0004, 0.0025];
    this.bubbleDecayRange = data.bubbleDecayRange ?? [0.004, 0.02];
    this.pitchDrift = data.pitchDrift ?? 0.05;
    this.impactDurationRange = data.impactDurationRange ?? [0.001, 0.004];
    this.bubbleProbability = data.bubbleProbability ?? 0.7;
    this.bubbleMix = data.bubbleMix;
    this.impactBandHz = data.impactBandHz;
    this.impactQ = data.impactQ;
    this.voiceLifetimeFrames = Math.round((data.voiceLifetimeSeconds ?? 0.05) * sampleRate);
    this.maxVoices = data.maxVoices ?? 24;

    this.nextInterval = createPoissonEvents(this.rng, { rateHz: data.rateHz ?? 20 });
    this.framesUntilNextEvent = Math.round(this.nextInterval() * sampleRate);
  }

  private spawnVoice(): void {
    const voice = createDropVoice(this.rng, {
      radiusMeters: sampleRange(this.rng, this.radiusRange),
      bubbleDecaySeconds: sampleRange(this.rng, this.bubbleDecayRange),
      pitchDrift: this.pitchDrift,
      impactDurationSeconds: sampleRange(this.rng, this.impactDurationRange),
      bubbleProbability: this.bubbleProbability,
      bubbleMix: this.bubbleMix,
      impactBandHz: this.impactBandHz,
      impactQ: this.impactQ,
      sampleRate,
    });
    const pan = this.rng() * 2 - 1;

    if (this.voices.length >= this.maxVoices) {
      this.voices.shift();
    }
    this.voices.push({ next: voice, pan, framesRemaining: this.voiceLifetimeFrames });
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] ?? output[0];

    for (let i = 0; i < left.length; i++) {
      if (this.framesUntilNextEvent <= 0) {
        this.spawnVoice();
        this.framesUntilNextEvent = Math.round(this.nextInterval() * sampleRate);
      }
      this.framesUntilNextEvent--;

      let sampleLeft = 0;
      let sampleRight = 0;

      for (let v = this.voices.length - 1; v >= 0; v--) {
        const active = this.voices[v];
        const sample = active.next();
        // Ley de potencia constante: -1 a la izquierda, +1 a la derecha.
        const angle = ((active.pan + 1) / 2) * (Math.PI / 2);
        sampleLeft += sample * Math.cos(angle);
        sampleRight += sample * Math.sin(angle);

        active.framesRemaining--;
        if (active.framesRemaining <= 0) {
          this.voices.splice(v, 1);
        }
      }

      left[i] = sampleLeft;
      right[i] = sampleRight;
    }

    return true;
  }
}

registerProcessor("dark-echo-dense-granular-processor", DenseGranularProcessor);
