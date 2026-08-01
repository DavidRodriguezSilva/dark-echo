import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { clamp, lfo, smoothRandom } from "./utils";

describe("clamp", () => {
  it("deja pasar valores dentro de rango", () => {
    expect(clamp(0.3)).toBe(0.3);
  });

  it("recorta por encima y por debajo del rango", () => {
    expect(clamp(5)).toBe(1);
    expect(clamp(-5)).toBe(-1);
  });

  it("admite un rango explicito", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
  });
});

describe("lfo", () => {
  it("permanece dentro de [min, max]", () => {
    for (let t = 0; t < 100; t += 0.37) {
      const value = lfo(t, 0.35, 0.25, 0.55);
      expect(value).toBeGreaterThanOrEqual(0.25);
      expect(value).toBeLessThanOrEqual(0.55);
    }
  });
});

describe("smoothRandom", () => {
  it("es determinista bajo semilla", () => {
    const rngA = mulberry32(8);
    const rngB = mulberry32(8);

    let a = 0;
    let b = 0;
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 50; i++) {
      a = smoothRandom(a, rngA, 0.05);
      b = smoothRandom(b, rngB, 0.05);
      seqA.push(a);
      seqB.push(b);
    }

    expect(seqA).toEqual(seqB);
  });

  it("se mueve suavemente: cada paso cambia como mucho `amount * 2`", () => {
    const rng = mulberry32(15);
    let value = 0;
    for (let i = 0; i < 200; i++) {
      const next = smoothRandom(value, rng, 0.01);
      expect(Math.abs(next - value)).toBeLessThanOrEqual(0.02 + 1e-9);
      value = next;
    }
  });
});
