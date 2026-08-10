import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { createPoissonEvents } from "./eventProcess";

describe("createPoissonEvents", () => {
  it("produce siempre intervalos positivos", () => {
    const nextInterval = createPoissonEvents(mulberry32(1), { rateHz: 2 });

    for (let i = 0; i < 2000; i++) {
      expect(nextInterval()).toBeGreaterThan(0);
    }
  });

  it("la media de los intervalos converge a 1 / rateHz", () => {
    const rateHz = 4;
    const nextInterval = createPoissonEvents(mulberry32(9), { rateHz });

    const n = 20000;
    let total = 0;
    for (let i = 0; i < n; i++) total += nextInterval();

    const mean = total / n;
    expect(mean).toBeCloseTo(1 / rateHz, 1);
  });

  it("los intervalos no son constantes (no es un reloj fijo)", () => {
    const nextInterval = createPoissonEvents(mulberry32(15), { rateHz: 1 });
    const intervals = Array.from({ length: 200 }, () => nextInterval());
    const unique = new Set(intervals.map((value) => value.toFixed(6)));

    expect(unique.size).toBeGreaterThan(190);
  });

  it("es determinista bajo semilla", () => {
    const a = createPoissonEvents(mulberry32(30), { rateHz: 3 });
    const b = createPoissonEvents(mulberry32(30), { rateHz: 3 });

    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());

    expect(seqA).toEqual(seqB);
  });
});
