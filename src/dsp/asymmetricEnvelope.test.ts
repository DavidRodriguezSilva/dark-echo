import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { createAsymmetricEnvelope } from "./asymmetricEnvelope";

describe("createAsymmetricEnvelope", () => {
  it("permanece dentro de [min, max]", () => {
    const envelope = createAsymmetricEnvelope(mulberry32(1), {
      min: 0.15,
      max: 0.9,
      periodSeconds: 8,
      riseFraction: 0.35,
      sampleRate: 1000,
    });

    for (let i = 0; i < 50000; i++) {
      const value = envelope();
      expect(value).toBeGreaterThanOrEqual(0.15 - 1e-9);
      expect(value).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it("asciende mas rapido de lo que desciende (asimetria real, no un LFO simetrico)", () => {
    const sampleRate = 1000;
    const periodSeconds = 8;
    const riseFraction = 0.35;
    const envelope = createAsymmetricEnvelope(mulberry32(2), {
      min: 0,
      max: 1,
      periodSeconds,
      riseFraction,
      periodJitter: 0,
      sampleRate,
    });

    const samples: number[] = [];
    for (let i = 0; i < periodSeconds * sampleRate; i++) samples.push(envelope());

    // Busca el instante del pico dentro del primer ciclo.
    let peakIndex = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i] > samples[peakIndex]) peakIndex = i;
    }
    const peakFraction = peakIndex / samples.length;

    // El pico deberia llegar cerca de riseFraction, muy antes de la mitad
    // del periodo si riseFraction < 0.5.
    expect(peakFraction).toBeLessThan(0.5);
    expect(peakFraction).toBeGreaterThan(riseFraction - 0.05);
    expect(peakFraction).toBeLessThan(riseFraction + 0.05);
  });

  it("es determinista bajo semilla", () => {
    const options = {
      min: 0,
      max: 1,
      periodSeconds: 5,
      riseFraction: 0.4,
      sampleRate: 500,
    };
    const a = createAsymmetricEnvelope(mulberry32(9), options);
    const b = createAsymmetricEnvelope(mulberry32(9), options);

    const seqA = Array.from({ length: 3000 }, () => a());
    const seqB = Array.from({ length: 3000 }, () => b());

    expect(seqA).toEqual(seqB);
  });

  it("con jitter de periodo, dos ciclos sucesivos no son identicos", () => {
    const sampleRate = 1000;
    const periodSeconds = 4;
    const envelope = createAsymmetricEnvelope(mulberry32(5), {
      min: 0,
      max: 1,
      periodSeconds,
      riseFraction: 0.35,
      periodJitter: 0.3,
      sampleRate,
    });

    const cycleSamples = periodSeconds * sampleRate;
    const first = Array.from({ length: cycleSamples }, () => envelope());
    const second = Array.from({ length: cycleSamples }, () => envelope());

    expect(first).not.toEqual(second);
  });
});
