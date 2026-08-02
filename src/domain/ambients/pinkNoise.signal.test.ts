import { describe, expect, it } from "vitest";
import { compileLayer } from "../../audio/layerCompiler";
import { pinkNoise } from "./pinkNoise";
import { spectralSlopeDbPerOctave } from "../../testing/fft";
import {
  maxPeakExcludingZeroLag,
  normalizedAutocorrelation,
  rmsEnvelope,
} from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de `pink-noise` (refinamiento del catalogo: ruido de
 * color). Ver docs/synthesis-reference.md, `ruido-de-color`, para el criterio
 * de pendiente espectral y la tolerancia (el filtro de Kellet es una
 * aproximacion, no una PSD 1/f exacta).
 */

const ANALYSIS_BAND_HZ: [number, number] = [100, 8000];
const EXPECTED_SLOPE_DB_PER_OCTAVE = -3;
const SLOPE_TOLERANCE_DB_PER_OCTAVE = 1;
const MAX_PERIODICITY_PEAK = 0.4;
const MIN_MONO_COMPATIBILITY = 0.5;
const PERIODICITY_GUARD_SECONDS = 1;
const WINDOW_SECONDS = 0.05;

async function renderPinkNoiseMix(
  sampleRateHz: number,
  durationSeconds: number
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/noiseProcessor.ts", import.meta.url)
  );

  let seed = 6000;
  for (const id of Object.keys(pinkNoise.layers)) {
    const layer = compileLayer(context, pinkNoise.layers[id], seed);
    layer.output.gain.setValueAtTime(pinkNoise.layers[id].gain, 0);
    layer.output.connect(context.destination);
    seed += 97;
  }

  return context.startRendering();
}

describe("pink-noise — pendiente espectral", () => {
  it("mantiene una pendiente espectral cercana a -3 dB/oct", async () => {
    const buffer = await renderPinkNoiseMix(44100, 20);
    const slope = spectralSlopeDbPerOctave(buffer.getChannelData(0), 44100, ANALYSIS_BAND_HZ);

    expect(slope).toBeGreaterThanOrEqual(
      EXPECTED_SLOPE_DB_PER_OCTAVE - SLOPE_TOLERANCE_DB_PER_OCTAVE
    );
    expect(slope).toBeLessThanOrEqual(EXPECTED_SLOPE_DB_PER_OCTAVE + SLOPE_TOLERANCE_DB_PER_OCTAVE);
  });
});

describe("pink-noise — ausencia de periodicidad", () => {
  it("no muestra un pico de autocorrelación de la envolvente por encima del umbral", async () => {
    const buffer = await renderPinkNoiseMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const guardWindows = Math.round(PERIODICITY_GUARD_SECONDS / WINDOW_SECONDS);
    const peak = maxPeakExcludingZeroLag(autocorrelation, guardWindows);

    expect(peak).toBeLessThan(MAX_PERIODICITY_PEAK);
  }, 60000);
});

describe("pink-noise — compatibilidad mono", () => {
  it("la suma a mono no cancela la capa de forma severa", async () => {
    const buffer = await renderPinkNoiseMix(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});
