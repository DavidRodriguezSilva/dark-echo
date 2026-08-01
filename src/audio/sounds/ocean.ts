import { BrownNoise, whiteNoise } from "../../dsp/noise";
import { type SoundGenerator } from "../../domain/types";
import { clamp, lfo } from "../../dsp/utils";

export class OceanSound implements SoundGenerator {
  private brown = new BrownNoise();
  private foamMemory = 0;

  nextSample(time: number): number {
    const wave = lfo(time, 0.12, 0.15, 0.9);
    const deepWater = this.brown.next() * 0.45 * wave;

    const foam = whiteNoise();
    this.foamMemory = this.foamMemory * 0.8 + foam * 0.2;

    const foamLayer = this.foamMemory * 0.12 * wave;

    return clamp(deepWater + foamLayer);
  }
}
