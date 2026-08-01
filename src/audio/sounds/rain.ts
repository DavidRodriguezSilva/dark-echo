import { whiteNoise } from "../../dsp/noise";
import type { Rng } from "../../dsp/prng";
import { type SoundGenerator } from "../../domain/types";
import { clamp, lfo } from "../../dsp/utils";

export class RainSound implements SoundGenerator {
  private last = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  nextSample(time: number): number {
    const base = whiteNoise(this.rng);

    // Suaviza un poco para que no suene como estática pura
    this.last = this.last * 0.65 + base * 0.35;

    // Variación lenta de intensidad
    const intensity = lfo(time, 0.35, 0.25, 0.55);

    // Capa de gotas finas
    const fineDrops = whiteNoise(this.rng) * 0.08;

    return clamp((this.last * 0.35 + fineDrops) * intensity);
  }
}
