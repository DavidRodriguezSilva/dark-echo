import { BrownNoise } from "../../dsp/noise";
import { type SoundGenerator } from "../../domain/types";
import { clamp, lfo, smoothRandom } from "../../dsp/utils";

export class WindSound implements SoundGenerator {
  private brown = new BrownNoise();
  private movement = 0;

  nextSample(time: number): number {
    const base = this.brown.next();

    this.movement = smoothRandom(this.movement, 0.002);

    const gust = lfo(time, 0.18, 0.15, 0.85);
    const slowMovement = 0.6 + this.movement * 0.25;

    return clamp(base * gust * slowMovement * 0.45);
  }
}
