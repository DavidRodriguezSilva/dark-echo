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

// Escala de salida del filtro de Kellet (ver mas abajo): el filtro crudo
// alcanza una desviacion estandar de ~1.75 sobre entrada blanca en [-1, 1];
// esta constante la lleva a ~0.35, entre el blanco (~0.58) y el marron
// (~0.2), coherente con que su inclinacion espectral tambien queda entre
// ambos (docs/synthesis-reference.md, `ruido-de-color`).
const PINK_OUTPUT_SCALE = 0.2;

/**
 * Ruido rosa (docs/synthesis-reference.md, `ruido-de-color`): aproximacion
 * de 3 polos de Paul Kellet ("economy" pink noise filter, dominio publico) a
 * una densidad espectral de potencia ~1/f sobre ruido blanco.
 */
export class PinkNoise {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  next(): number {
    const white = whiteNoise(this.rng);
    this.b0 = 0.99765 * this.b0 + white * 0.099046;
    this.b1 = 0.963 * this.b1 + white * 0.2965164;
    this.b2 = 0.57 * this.b2 + white * 1.0526913;
    const pink = this.b0 + this.b1 + this.b2 + white * 0.1848;
    return pink * PINK_OUTPUT_SCALE;
  }
}
