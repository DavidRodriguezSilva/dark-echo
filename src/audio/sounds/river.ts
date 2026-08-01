import { BrownNoise, whiteNoise } from "../../dsp/noise";
import type { Rng } from "../../dsp/prng";
import { type SoundGenerator } from "../../domain/types";
import { clamp, lfo } from "../../dsp/utils";

export class RiverSound implements SoundGenerator {
  private low: BrownNoise;
  private midMemory = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
    this.low = new BrownNoise(rng);
  }

  nextSample(time: number): number {
    const lowFlow = this.low.next() * 0.25;

    const mid = whiteNoise(this.rng);
    this.midMemory = this.midMemory * 0.45 + mid * 0.55;

    const sparkle = whiteNoise(this.rng) * 0.05;
    const flow = lfo(time, 0.22, 0.35, 0.65);

    return clamp((lowFlow + this.midMemory * 0.25 + sparkle) * flow);
  }
}
