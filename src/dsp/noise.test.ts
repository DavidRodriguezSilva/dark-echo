import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { BrownNoise, PinkNoise, whiteNoise } from "./noise";

describe("whiteNoise", () => {
  it("es determinista bajo semilla", () => {
    const rngA = mulberry32(99);
    const rngB = mulberry32(99);

    const a = Array.from({ length: 50 }, () => whiteNoise(rngA));
    const b = Array.from({ length: 50 }, () => whiteNoise(rngB));

    expect(a).toEqual(b);
  });

  it("permanece en el rango [-1, 1]", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 2000; i++) {
      const sample = whiteNoise(rng);
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    }
  });

  it("tiene media cercana a cero sobre una muestra larga", () => {
    const rng = mulberry32(11);
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += whiteNoise(rng);

    expect(Math.abs(sum / n)).toBeLessThan(0.02);
  });
});

describe("BrownNoise", () => {
  it("es determinista bajo semilla", () => {
    const a = new BrownNoise(mulberry32(3));
    const b = new BrownNoise(mulberry32(3));

    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it("es mas suave que el ruido blanco (menor variacion entre muestras consecutivas)", () => {
    const brown = new BrownNoise(mulberry32(21));
    const white = mulberry32(21);

    const brownSamples = Array.from({ length: 5000 }, () => brown.next());
    const whiteSamples = Array.from({ length: 5000 }, () => whiteNoise(white));

    const meanAbsDiff = (samples: number[]) => {
      let total = 0;
      for (let i = 1; i < samples.length; i++) total += Math.abs(samples[i] - samples[i - 1]);
      return total / (samples.length - 1);
    };

    expect(meanAbsDiff(brownSamples)).toBeLessThan(meanAbsDiff(whiteSamples));
  });
});

describe("PinkNoise", () => {
  it("es determinista bajo semilla", () => {
    const a = new PinkNoise(mulberry32(7));
    const b = new PinkNoise(mulberry32(7));

    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it("es mas suave que el ruido blanco pero mas rapido que el marron (menor/mayor variacion entre muestras consecutivas)", () => {
    const pink = new PinkNoise(mulberry32(21));
    const brown = new BrownNoise(mulberry32(21));
    const white = mulberry32(21);

    const meanAbsDiff = (samples: number[]) => {
      let total = 0;
      for (let i = 1; i < samples.length; i++) total += Math.abs(samples[i] - samples[i - 1]);
      return total / (samples.length - 1);
    };

    const pinkSamples = Array.from({ length: 5000 }, () => pink.next());
    const brownSamples = Array.from({ length: 5000 }, () => brown.next());
    const whiteSamples = Array.from({ length: 5000 }, () => whiteNoise(white));

    const pinkVariation = meanAbsDiff(pinkSamples);
    expect(pinkVariation).toBeLessThan(meanAbsDiff(whiteSamples));
    expect(pinkVariation).toBeGreaterThan(meanAbsDiff(brownSamples));
  });
});
