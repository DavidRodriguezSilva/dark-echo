import { describe, expect, it } from "vitest";
import { compileLayer } from "../../audio/layerCompiler";
import { wind } from "./wind";
import { fractionOfEnergyInBand } from "../../testing/fft";
import {
  maxPeakExcludingZeroLag,
  normalizedAutocorrelation,
  rmsEnvelope,
} from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de `wind` (tarea 10.4). Umbrales calibrados sobre este
 * mismo render; ver docs/synthesis-reference.md.
 */

const DECLARED_BAND_HZ: [number, number] = [150, 3000];
const MIN_FRACTION_IN_BAND = 0.4;
const MAX_PERIODICITY_PEAK = 0.4;
const MIN_MONO_COMPATIBILITY = 0.5;
const PERIODICITY_GUARD_SECONDS = 1;
const WINDOW_SECONDS = 0.05;

async function renderWindMix(sampleRateHz: number, durationSeconds: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/noiseProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/modulatorProcessor.ts", import.meta.url)
  );

  let seed = 2000;
  for (const id of Object.keys(wind.layers)) {
    const layer = compileLayer(context, wind.layers[id], seed);
    layer.output.gain.setValueAtTime(wind.layers[id].gain, 0);
    layer.output.connect(context.destination);
    seed += 97;
  }

  return context.startRendering();
}

describe("wind — perfil espectral", () => {
  it("concentra al menos el 40% de su energía dentro de la banda declarada (150 Hz - 3 kHz)", async () => {
    const buffer = await renderWindMix(44100, 20);
    const fraction = fractionOfEnergyInBand(buffer.getChannelData(0), 44100, DECLARED_BAND_HZ);

    expect(fraction).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
  });
});

describe("wind — ausencia de periodicidad", () => {
  it("no muestra un pico de autocorrelación de la envolvente por encima del umbral", async () => {
    const buffer = await renderWindMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const guardWindows = Math.round(PERIODICITY_GUARD_SECONDS / WINDOW_SECONDS);
    const peak = maxPeakExcludingZeroLag(autocorrelation, guardWindows);

    expect(peak).toBeLessThan(MAX_PERIODICITY_PEAK);
  }, 60000);
});

describe("wind — compatibilidad mono", () => {
  it("la suma a mono no cancela la capa de forma severa", async () => {
    const buffer = await renderWindMix(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});
