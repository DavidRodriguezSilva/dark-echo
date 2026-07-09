import { BrownNoise, whiteNoise } from "../noise";
import { type SoundGenerator } from "../types";
import { clamp, lfo } from "../utils";

export class RiverSound implements SoundGenerator {
  private low = new BrownNoise();
  private midMemory = 0;

  nextSample(time: number): number {
    const lowFlow = this.low.next() * 0.25;

    const mid = whiteNoise();
    this.midMemory = this.midMemory * 0.45 + mid * 0.55;

    const sparkle = whiteNoise() * 0.05;
    const flow = lfo(time, 0.22, 0.35, 0.65);

    return clamp((lowFlow + this.midMemory * 0.25 + sparkle) * flow);
  }
}
