import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";
import { bubbleInstantFrequency, createDropVoice, minnaertFrequency } from "./dropVoice";

describe("minnaertFrequency", () => {
  it("sigue la relacion inversa con el radio declarada en synthesis-reference", () => {
    // f0 ~ 3.26 / r: el radio del rango declarado (0.0004 - 0.0025 m)
    // produce tonos de ~1.3 kHz a ~8 kHz.
    expect(minnaertFrequency(0.0004)).toBeCloseTo(8150, 0);
    expect(minnaertFrequency(0.0025)).toBeCloseTo(1304, 0);
  });

  it("es estrictamente decreciente en el radio", () => {
    const small = minnaertFrequency(0.0006);
    const large = minnaertFrequency(0.0018);
    expect(small).toBeGreaterThan(large);
  });

  it("duplicar el radio divide la frecuencia a la mitad (relacion inversa exacta)", () => {
    const r = 0.001;
    expect(minnaertFrequency(r) / minnaertFrequency(r * 2)).toBeCloseTo(2, 6);
  });
});

describe("bubbleInstantFrequency", () => {
  it("en t=0 coincide exactamente con la resonancia de Minnaert para ese radio", () => {
    const radius = 0.0012;
    expect(bubbleInstantFrequency(radius, 0.05, 0.01, 0)).toBeCloseTo(minnaertFrequency(radius), 6);
  });

  it("sube hasta f0 * (1 + pitchDrift) al final del decaimiento declarado", () => {
    const radius = 0.0012;
    const pitchDrift = 0.05;
    const decay = 0.01;
    const f0 = minnaertFrequency(radius);

    expect(bubbleInstantFrequency(radius, pitchDrift, decay, decay)).toBeCloseTo(f0 * 1.05, 6);
  });

  it("no supera el limite de deriva mas alla de la duracion del decaimiento", () => {
    const radius = 0.0012;
    const pitchDrift = 0.05;
    const decay = 0.01;
    const f0 = minnaertFrequency(radius);

    expect(bubbleInstantFrequency(radius, pitchDrift, decay, decay * 5)).toBeCloseTo(f0 * 1.05, 6);
  });
});

describe("createDropVoice", () => {
  it("produce una senal acotada y finita a lo largo de su duracion", () => {
    const voice = createDropVoice(mulberry32(3), {
      radiusMeters: 0.001,
      bubbleDecaySeconds: 0.015,
      pitchDrift: 0.05,
      impactDurationSeconds: 0.002,
      sampleRate: 44100,
    });

    for (let i = 0; i < 4410; i++) {
      const sample = voice();
      expect(Number.isFinite(sample)).toBe(true);
      expect(Math.abs(sample)).toBeLessThanOrEqual(1);
    }
  });

  it("es determinista bajo semilla", () => {
    const options = {
      radiusMeters: 0.0015,
      bubbleDecaySeconds: 0.012,
      pitchDrift: 0.04,
      impactDurationSeconds: 0.003,
      sampleRate: 44100,
    };

    const a = createDropVoice(mulberry32(50), options);
    const b = createDropVoice(mulberry32(50), options);

    const seqA = Array.from({ length: 200 }, () => a());
    const seqB = Array.from({ length: 200 }, () => b());

    expect(seqA).toEqual(seqB);
  });
});
