import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { createModulator } from "./modulator";

describe("createModulator", () => {
  it("permanece dentro de [min, max] a lo largo de muchas llamadas", () => {
    const modulator = createModulator(mulberry32(1), {
      min: 0.25,
      max: 0.55,
      basePeriodSeconds: 3,
    });

    for (let step = 0; step < 5000; step++) {
      const time = step * 0.01;
      const value = modulator(time);
      expect(value).toBeGreaterThanOrEqual(0.25);
      expect(value).toBeLessThanOrEqual(0.55);
    }
  });

  it("es determinista bajo semilla", () => {
    const a = createModulator(mulberry32(77), { min: 0, max: 1, basePeriodSeconds: 5 });
    const b = createModulator(mulberry32(77), { min: 0, max: 1, basePeriodSeconds: 5 });

    const seqA = Array.from({ length: 200 }, (_, i) => a(i * 0.02));
    const seqB = Array.from({ length: 200 }, (_, i) => b(i * 0.02));

    expect(seqA).toEqual(seqB);
  });

  it("no vuelve a un estado identico dentro del periodo base (rompe el ciclo de un LFO simple)", () => {
    const modulator = createModulator(mulberry32(4), {
      min: -1,
      max: 1,
      basePeriodSeconds: 2,
      randomWalkWeight: 0,
    });

    // Un LFO de un solo seno con este periodo repetiria exactamente en t=2s.
    // La suma de periodos inconmensurables no deberia.
    const early: number[] = [];
    const later: number[] = [];
    for (let i = 0; i < 50; i++) {
      early.push(modulator(i * 0.01));
    }
    for (let i = 0; i < 50; i++) {
      later.push(modulator(2 + i * 0.01));
    }

    expect(early).not.toEqual(later);
  });
});
