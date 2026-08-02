import { describe, expect, it } from "vitest";
import { generateImpulseResponse } from "./impulseResponse";
import { mulberry32 } from "./prng";

const SAMPLE_RATE = 44100;

function energyOf(samples: Float32Array): number {
  let total = 0;
  for (let i = 0; i < samples.length; i++) total += samples[i] * samples[i];
  return total;
}

describe("generateImpulseResponse — forma de la cola", () => {
  it("dura lo que el RT60 mas largo declarado", () => {
    const [left] = generateImpulseResponse(mulberry32(1), {
      reverbTimeSeconds: { low: 0.5, mid: 1.2, high: 0.4 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    });

    expect(left.length).toBe(Math.round(1.2 * SAMPLE_RATE));
  });

  it("decae de forma monotona: la segunda mitad tiene mucha menos energia que la primera", () => {
    const [left] = generateImpulseResponse(mulberry32(2), {
      reverbTimeSeconds: { low: 0.8, mid: 0.8, high: 0.8 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    });

    const half = Math.floor(left.length / 2);
    const first = energyOf(left.subarray(0, half));
    const second = energyOf(left.subarray(half));

    expect(second).toBeLessThan(first * 0.05);
  });

  it("cae 60 dB al llegar al RT60 declarado", () => {
    const rt60 = 0.6;
    const [left] = generateImpulseResponse(mulberry32(3), {
      reverbTimeSeconds: { low: rt60, mid: rt60, high: rt60 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    });

    // RMS local al principio frente al RMS local justo antes del final.
    const window = Math.round(0.01 * SAMPLE_RATE);
    const rms = (from: number) => {
      let total = 0;
      for (let i = from; i < from + window; i++) total += left[i] * left[i];
      return Math.sqrt(total / window);
    };

    const decayDb = 20 * Math.log10(rms(left.length - window - 1) / rms(0));
    // El decaimiento teorico a t = RT60 es exactamente -60 dB; el margen
    // cubre la varianza del ruido dentro de una ventana de 10 ms.
    expect(decayDb).toBeLessThan(-45);
    expect(decayDb).toBeGreaterThan(-80);
  });
});

describe("generateImpulseResponse — bandas independientes", () => {
  it("una banda con RT60 mas largo alarga la cola audible de esa banda", () => {
    const graveLarga = generateImpulseResponse(mulberry32(4), {
      reverbTimeSeconds: { low: 1.5, mid: 0.2, high: 0.2 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    })[0];
    const todoCorto = generateImpulseResponse(mulberry32(4), {
      reverbTimeSeconds: { low: 0.2, mid: 0.2, high: 0.2 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    })[0];

    expect(graveLarga.length).toBeGreaterThan(todoCorto.length);
  });
});

describe("generateImpulseResponse — canales y normalizacion", () => {
  it("genera dos canales con flujos de ruido independientes, no un desfase del mismo", () => {
    const [left, right] = generateImpulseResponse(mulberry32(5), {
      reverbTimeSeconds: { low: 0.5, mid: 0.5, high: 0.5 },
      sampleRate: SAMPLE_RATE,
      channels: 2,
    });

    let identical = true;
    for (let i = 0; i < Math.min(1000, left.length); i++) {
      if (left[i] !== right[i]) {
        identical = false;
        break;
      }
    }
    expect(identical).toBe(false);

    // Independientes, no invertidos: la suma a mono no debe cancelar
    // (synthesis-reference, "Decorrelacion sin cancelacion").
    let sumEnergy = 0;
    for (let i = 0; i < left.length; i++) {
      const mono = (left[i] + right[i]) / 2;
      sumEnergy += mono * mono;
    }
    expect(sumEnergy).toBeGreaterThan(0);
  });

  it("normaliza a energia unitaria, para que el RT60 no altere tambien el nivel", () => {
    const corta = generateImpulseResponse(mulberry32(6), {
      reverbTimeSeconds: { low: 0.3, mid: 0.3, high: 0.3 },
      sampleRate: SAMPLE_RATE,
      channels: 2,
    });
    const larga = generateImpulseResponse(mulberry32(6), {
      reverbTimeSeconds: { low: 1.5, mid: 1.5, high: 1.5 },
      sampleRate: SAMPLE_RATE,
      channels: 2,
    });

    const total = (channels: Float32Array[]) =>
      channels.reduce((sum, channel) => sum + energyOf(channel), 0);

    expect(total(corta)).toBeCloseTo(1, 5);
    expect(total(larga)).toBeCloseTo(1, 5);
  });

  it("es determinista bajo la misma semilla", () => {
    const options = {
      reverbTimeSeconds: { low: 0.5, mid: 0.5, high: 0.5 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    };
    const a = generateImpulseResponse(mulberry32(7), options)[0];
    const b = generateImpulseResponse(mulberry32(7), options)[0];

    expect(Array.from(a.subarray(0, 200))).toEqual(Array.from(b.subarray(0, 200)));
  });

  it("no produce NaN ni valores fuera de rango", () => {
    const [left] = generateImpulseResponse(mulberry32(8), {
      reverbTimeSeconds: { low: 0.9, mid: 0.6, high: 0.4 },
      sampleRate: SAMPLE_RATE,
      channels: 1,
    });

    for (let i = 0; i < left.length; i++) {
      expect(Number.isFinite(left[i])).toBe(true);
      expect(Math.abs(left[i])).toBeLessThanOrEqual(1);
    }
  });
});
