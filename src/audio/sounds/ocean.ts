import { BrownNoise, whiteNoise } from "../../dsp/noise";
import type { Rng } from "../../dsp/prng";
import { type SoundGenerator } from "../../domain/types";
import { clamp, lfo } from "../../dsp/utils";

export class OceanSound implements SoundGenerator {
  private brown: BrownNoise;
  private foamMemory = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
    this.brown = new BrownNoise(rng);
  }

  nextSample(time: number): number {
    const wave = lfo(time, 0.12, 0.15, 0.9);
    const deepWater = this.brown.next() * 0.45 * wave;

    const foam = whiteNoise(this.rng);
    this.foamMemory = this.foamMemory * 0.8 + foam * 0.2;

    const foamLayer = this.foamMemory * 0.12 * wave;

    return clamp(deepWater + foamLayer);
  }
}
