import type { Rng } from "./prng";

export function whiteNoise(rng: Rng): number {
  return rng() * 2 - 1;
}

export class BrownNoise {
  private last = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  next(): number {
    const white = whiteNoise(this.rng);
    this.last = (this.last + 0.02 * white) / 1.02;
    return this.last * 3.5;
  }
}
