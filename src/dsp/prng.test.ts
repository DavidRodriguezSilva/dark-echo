import { describe, expect, it } from "vitest";
import { deriveLayerSeed, mulberry32, randomSeed } from "./prng";

describe("mulberry32", () => {
  it("misma semilla, misma secuencia", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());

    expect(sequenceA).toEqual(sequenceB);
  });

  it("semillas distintas, secuencias distintas", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);

    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it("produce valores en [0, 1)", () => {
    const rng = mulberry32(7);

    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("no repite un ciclo corto detectable en 1000 muestras", () => {
    const rng = mulberry32(123);
    const values = Array.from({ length: 1000 }, () => rng());
    const unique = new Set(values);

    expect(unique.size).toBeGreaterThan(990);
  });
});

describe("randomSeed", () => {
  it("produce semillas distintas en llamadas sucesivas", () => {
    const seeds = new Set(Array.from({ length: 20 }, () => randomSeed()));
    expect(seeds.size).toBeGreaterThan(15);
  });

  it("produce enteros de 32 bits sin signo", () => {
    for (let i = 0; i < 20; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("deriveLayerSeed", () => {
  it("misma base y mismo id, mismo resultado", () => {
    expect(deriveLayerSeed(123, "rain.cuerpo")).toBe(deriveLayerSeed(123, "rain.cuerpo"));
  });

  it("distinta base, mismo id -> distinto resultado (sesiones sucesivas no repiten desarrollo temporal)", () => {
    expect(deriveLayerSeed(1, "rain.cuerpo")).not.toBe(deriveLayerSeed(2, "rain.cuerpo"));
  });

  it("misma base, distinto id -> distinto resultado (dos capas del mismo ambiente no comparten secuencia)", () => {
    expect(deriveLayerSeed(123, "rain.cuerpo")).not.toBe(deriveLayerSeed(123, "rain.impactos"));
  });

  it("nunca devuelve 0 (una semilla 0 degenera en mulberry32)", () => {
    // Un hash de id que produce 0 al combinarse con la base cayendo justo
    // en `sessionSeed` (XOR se anula) es el caso limite que fuerza el `|| 1`.
    expect(deriveLayerSeed(0, "")).toBe(1);
  });
});
