import { whiteNoise } from "../noise";
import { type SoundGenerator } from "../types";
import { clamp, lfo } from "../utils";

export class RainSound implements SoundGenerator {
  private last = 0;

  nextSample(time: number): number {
    const base = whiteNoise();

    // Suaviza un poco para que no suene como estática pura
    this.last = this.last * 0.65 + base * 0.35;

    // Variación lenta de intensidad
    const intensity = lfo(time, 0.35, 0.25, 0.55);

    // Capa de gotas finas
    const fineDrops = whiteNoise() * 0.08;

    return clamp((this.last * 0.35 + fineDrops) * intensity);
  }
}
