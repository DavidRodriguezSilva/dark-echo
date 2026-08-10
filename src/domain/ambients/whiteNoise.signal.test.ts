import { describe, expect, it } from "vitest";
import { compileLayer } from "../../audio/layerCompiler";
import { whiteNoise } from "./whiteNoise";
import { spectralSlopeDbPerOctave } from "../../testing/fft";
import {
  maxPeakExcludingZeroLag,
  normalizedAutocorrelation,
  rmsEnvelope,
} from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de `white-noise` (refinamiento del catalogo: ruido de
 * color). Ver docs/synthesis-reference.md, `ruido-de-color`, para el criterio
 * de pendiente espectral.
 */

const ANALYSIS_BAND_HZ: [number, number] = [100, 8000];
const EXPECTED_SLOPE_DB_PER_OCTAVE = 0;
const SLOPE_TOLERANCE_DB_PER_OCTAVE = 1;
const MAX_PERIODICITY_PEAK = 0.4;
const MIN_MONO_COMPATIBILITY = 0.5;
const PERIODICITY_GUARD_SECONDS = 1;
const WINDOW_SECONDS = 0.05;

async function renderWhiteNoiseMix(
  sampleRateHz: number,
  durationSeconds: number
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/noiseProcessor.ts", import.meta.url)
  );

  let seed = 5000;
  for (const id of Object.keys(whiteNoise.layers)) {
    const layer = compileLayer(context, whiteNoise.layers[id], seed);
    layer.output.gain.setValueAtTime(whiteNoise.layers[id].gain, 0);
    layer.output.connect(context.destination);
    seed += 97;
  }

  return context.startRendering();
}

describe("white-noise — pendiente espectral", () => {
  it("mantiene una pendiente espectral cercana a 0 dB/oct (plana)", async () => {
    const buffer = await renderWhiteNoiseMix(44100, 20);
    const slope = spectralSlopeDbPerOctave(buffer.getChannelData(0), 44100, ANALYSIS_BAND_HZ);

    expect(slope).toBeGreaterThanOrEqual(
      EXPECTED_SLOPE_DB_PER_OCTAVE - SLOPE_TOLERANCE_DB_PER_OCTAVE
    );
    expect(slope).toBeLessThanOrEqual(EXPECTED_SLOPE_DB_PER_OCTAVE + SLOPE_TOLERANCE_DB_PER_OCTAVE);
  });
});

describe("white-noise — ausencia de periodicidad", () => {
  it("no muestra un pico de autocorrelación de la envolvente por encima del umbral", async () => {
    const buffer = await renderWhiteNoiseMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const guardWindows = Math.round(PERIODICITY_GUARD_SECONDS / WINDOW_SECONDS);
    const peak = maxPeakExcludingZeroLag(autocorrelation, guardWindows);

    expect(peak).toBeLessThan(MAX_PERIODICITY_PEAK);
  }, 60000);
});

describe("white-noise — compatibilidad mono", () => {
  it("la suma a mono no cancela la capa de forma severa", async () => {
    const buffer = await renderWhiteNoiseMix(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});
