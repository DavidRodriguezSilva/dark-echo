export function whiteNoise(): number {
  return Math.random() * 2 - 1;
}

export class BrownNoise {
  private last = 0;

  next(): number {
    const white = whiteNoise();
    this.last = (this.last + 0.02 * white) / 1.02;
    return this.last * 3.5;
  }
}
