import { describe, expect, it } from "vitest";
import { binFrequencyHz, fftRadix2, fractionOfEnergyInBand, magnitudeSpectrum } from "./fft";

function sineWave(frequencyHz: number, sampleRateHz: number, length: number): Float64Array {
  const signal = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    signal[i] = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRateHz);
  }
  return signal;
}

describe("fftRadix2", () => {
  it("rechaza longitudes que no son potencia de dos", () => {
    expect(() => fftRadix2(new Float64Array(100))).toThrow();
  });

  it("una señal constante (DC) solo tiene energia en el bin 0", () => {
    const signal = new Float64Array(64).fill(1);
    const { re, im } = fftRadix2(signal);

    expect(Math.abs(re[0])).toBeCloseTo(64, 5);
    expect(Math.abs(im[0])).toBeCloseTo(0, 5);
    for (let i = 1; i < 64; i++) {
      expect(Math.abs(re[i])).toBeCloseTo(0, 5);
      expect(Math.abs(im[i])).toBeCloseTo(0, 5);
    }
  });
});

describe("magnitudeSpectrum", () => {
  it("identifica el bin correcto para un tono puro conocido", () => {
    const sampleRateHz = 44100;
    const fftSize = 4096;
    const frequencyHz = 1000;

    const signal = sineWave(frequencyHz, sampleRateHz, fftSize);
    const spectrum = magnitudeSpectrum(signal);

    let peakBin = 0;
    for (let i = 1; i < spectrum.length; i++) {
      if (spectrum[i] > spectrum[peakBin]) peakBin = i;
    }

    const peakFrequency = binFrequencyHz(peakBin, fftSize, sampleRateHz);
    const binResolution = sampleRateHz / fftSize;
    expect(Math.abs(peakFrequency - frequencyHz)).toBeLessThan(binResolution);
  });

  it("la energia de un tono puro se concentra casi toda en su bin", () => {
    const sampleRateHz = 44100;
    const fftSize = 2048;
    const signal = sineWave(2000, sampleRateHz, fftSize);
    const spectrum = magnitudeSpectrum(signal);

    const totalEnergy = spectrum.reduce((sum, m) => sum + m * m, 0);
    const peakEnergy = Math.max(...spectrum) ** 2;

    expect(peakEnergy / totalEnergy).toBeGreaterThan(0.9);
  });
});

describe("fractionOfEnergyInBand", () => {
  it("un tono puro dentro de la banda declarada da una fraccion cercana a 1", () => {
    const sampleRateHz = 44100;
    const signal = sineWave(2000, sampleRateHz, 65536);
    const fraction = fractionOfEnergyInBand(signal, sampleRateHz, [1500, 2500], 65536);

    expect(fraction).toBeGreaterThan(0.95);
  });

  it("un tono puro fuera de la banda declarada da una fraccion cercana a 0", () => {
    const sampleRateHz = 44100;
    const signal = sineWave(8000, sampleRateHz, 65536);
    const fraction = fractionOfEnergyInBand(signal, sampleRateHz, [1500, 2500], 65536);

    expect(fraction).toBeLessThan(0.05);
  });
});
