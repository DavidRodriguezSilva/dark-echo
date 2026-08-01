import { describe, expect, it } from "vitest";
import { mulberry32 } from "../dsp/prng";
import { whiteNoise } from "../dsp/noise";
import { maxPeakExcludingZeroLag, normalizedAutocorrelation, rmsEnvelope } from "./autocorrelation";

describe("rmsEnvelope", () => {
  it("calcula el RMS correcto por ventana para una amplitud constante conocida", () => {
    const windowSize = 100;
    const signal = new Float64Array(windowSize * 3).fill(0.5);
    const envelope = rmsEnvelope(signal, windowSize);

    expect(envelope.length).toBe(3);
    for (const value of envelope) expect(value).toBeCloseTo(0.5, 10);
  });

  it("descarta la cola que no completa una ventana", () => {
    const windowSize = 10;
    const signal = new Float64Array(35);
    expect(rmsEnvelope(signal, windowSize).length).toBe(3);
  });
});

describe("normalizedAutocorrelation", () => {
  it("vale 1 en el desplazamiento nulo", () => {
    const signal = new Float64Array(200);
    for (let i = 0; i < signal.length; i++) signal[i] = Math.sin(i * 0.1);

    const autocorrelation = normalizedAutocorrelation(signal);
    expect(autocorrelation[0]).toBeCloseTo(1, 6);
  });

  it("detecta un ciclo claro: un pico fuerte en el lag del periodo", () => {
    const period = 20;
    const n = 400;
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i++) signal[i] = Math.sin((2 * Math.PI * i) / period);

    const autocorrelation = normalizedAutocorrelation(signal);
    // El propio periodo (y sus multiplos) deben mostrar correlacion alta.
    expect(autocorrelation[period]).toBeGreaterThan(0.9);
  });

  it("ruido blanco sembrado no muestra picos significativos fuera del lag 0", () => {
    const rng = mulberry32(42);
    const n = 2000;
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i++) signal[i] = whiteNoise(rng);

    const autocorrelation = normalizedAutocorrelation(signal);
    const peak = maxPeakExcludingZeroLag(autocorrelation, 1);

    expect(peak).toBeLessThan(0.2);
  });
});

describe("maxPeakExcludingZeroLag", () => {
  it("ignora el lag 0 aunque sea el valor mas alto", () => {
    const autocorrelation = new Float64Array([1, 0.1, 0.05, -0.2, 0.03]);
    expect(maxPeakExcludingZeroLag(autocorrelation)).toBeCloseTo(0.2, 6);
  });
});
