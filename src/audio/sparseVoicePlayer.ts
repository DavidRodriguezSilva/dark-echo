import { createDropVoice, type DropVoiceOptions } from "../dsp/dropVoice";
import type { Rng } from "../dsp/prng";

/**
 * Reproductor de eventos esporadicos (design.md D2): a diferencia de la
 * granulacion densa, aqui la voz se renderiza en el hilo principal --
 * `createDropVoice` es codigo puro, no necesita el worklet -- como un
 * `AudioBuffer` corto de un solo uso, y se programa con tiempo absoluto de
 * `AudioContext` mediante `LookaheadScheduler`.
 */
export interface SparseVoiceRanges {
  radiusRange: [number, number];
  bubbleDecayRange: [number, number];
  pitchDrift: number;
  impactDurationRange: [number, number];
  bubbleProbability?: number;
  /** Duracion a renderizar por voz, en segundos: debe cubrir el decaimiento mas largo posible. */
  renderDurationSeconds: number;
}

function sampleRange(rng: Rng, [min, max]: [number, number]): number {
  return min + rng() * (max - min);
}

function renderDropVoiceBuffer(
  context: BaseAudioContext,
  rng: Rng,
  ranges: SparseVoiceRanges
): AudioBuffer {
  const sampleRateHz = context.sampleRate;
  const options: DropVoiceOptions = {
    radiusMeters: sampleRange(rng, ranges.radiusRange),
    bubbleDecaySeconds: sampleRange(rng, ranges.bubbleDecayRange),
    pitchDrift: ranges.pitchDrift,
    impactDurationSeconds: sampleRange(rng, ranges.impactDurationRange),
    bubbleProbability: ranges.bubbleProbability ?? 0.7,
    sampleRate: sampleRateHz,
  };

  const length = Math.ceil(ranges.renderDurationSeconds * sampleRateHz);
  const buffer = context.createBuffer(1, length, sampleRateHz);
  const data = buffer.getChannelData(0);
  const voice = createDropVoice(rng, options);
  for (let i = 0; i < length; i++) data[i] = voice();

  return buffer;
}

export class SparseVoicePlayer {
  private readonly context: BaseAudioContext;
  private readonly rng: Rng;
  private readonly ranges: SparseVoiceRanges;
  private readonly destination: AudioNode;

  constructor(
    context: BaseAudioContext,
    rng: Rng,
    ranges: SparseVoiceRanges,
    destination: AudioNode
  ) {
    this.context = context;
    this.rng = rng;
    this.ranges = ranges;
    this.destination = destination;
  }

  /** Renderiza una voz nueva (parametros muestreados dentro de los rangos) y la programa en `timeSeconds`. */
  playAt(timeSeconds: number): void {
    const buffer = renderDropVoiceBuffer(this.context, this.rng, this.ranges);
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Cada disparo en una posicion distinta del campo estereo (D16).
    const panner = this.context.createStereoPanner();
    panner.pan.value = this.rng() * 2 - 1;

    source.connect(panner);
    panner.connect(this.destination);
    source.start(timeSeconds);
    source.onended = () => {
      source.disconnect();
      panner.disconnect();
    };
  }
}
