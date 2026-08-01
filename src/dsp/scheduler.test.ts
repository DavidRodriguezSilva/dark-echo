import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { createPoissonEvents } from "./eventProcess";
import { scheduleUpToHorizon } from "./scheduler";

describe("scheduleUpToHorizon", () => {
  it("no programa nada si el proximo evento ya esta mas alla del horizonte", () => {
    const fired: number[] = [];
    const next = scheduleUpToHorizon(
      10,
      5,
      () => 1,
      (t) => fired.push(t)
    );

    expect(fired).toEqual([]);
    expect(next).toBe(10);
  });

  it("programa todos los disparos que caben antes del horizonte, con intervalo constante", () => {
    const fired: number[] = [];
    const next = scheduleUpToHorizon(
      0,
      5,
      () => 1,
      (t) => fired.push(t)
    );

    expect(fired).toEqual([0, 1, 2, 3, 4]);
    expect(next).toBe(5);
  });

  it("el proximo evento devuelto sigue siendo valido para una llamada posterior con un horizonte mayor", () => {
    const fired: number[] = [];
    const nextInterval = () => 2;

    const afterFirst = scheduleUpToHorizon(0, 5, nextInterval, (t) => fired.push(t));
    const afterSecond = scheduleUpToHorizon(afterFirst, 11, nextInterval, (t) => fired.push(t));

    expect(fired).toEqual([0, 2, 4, 6, 8, 10]);
    expect(afterSecond).toBe(12);
  });

  it("funciona con un generador de intervalos no constante (Poisson sembrado)", () => {
    const nextInterval = createPoissonEvents(mulberry32(1), { rateHz: 2 });
    const fired: number[] = [];

    const next = scheduleUpToHorizon(0, 50, nextInterval, (t) => fired.push(t));

    expect(fired.length).toBeGreaterThan(0);
    expect(next).toBeGreaterThanOrEqual(50);
    // Los disparos estan ordenados y ninguno cae mas alla del horizonte.
    for (let i = 0; i < fired.length; i++) {
      expect(fired[i]).toBeLessThan(50);
      if (i > 0) expect(fired[i]).toBeGreaterThan(fired[i - 1]);
    }
  });
});
