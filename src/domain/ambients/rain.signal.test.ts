import { describe, expect, it } from "vitest";
import { compileLayer } from "../../audio/layerCompiler";
import { rain } from "./rain";
import { fractionOfEnergyInBand } from "../../testing/fft";
import {
  maxPeakExcludingZeroLag,
  normalizedAutocorrelation,
  rmsEnvelope,
} from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de `rain` (design.md D8, synthesis-reference "Criterios de
 * aceptacion"): renderizan el grafo real con `OfflineAudioContext` -- worklets
 * incluidos -- en un navegador de verdad, no una replica en TS puro. Umbrales
 * calibrados en la tarea 9.4/10.4 sobre este mismo render; ver
 * docs/synthesis-reference.md para la medicion completa.
 *
 * El umbral de periodicidad se mide excluyendo el primer segundo de
 * desplazamiento (la suavidad natural de cualquier envolvente que varia
 * lentamente ya produce autocorrelacion alta ahi, y no es lo que este
 * criterio quiere detectar -- ver la nota de metodologia en el documento).
 */

const DECLARED_BAND_HZ: [number, number] = [800, 6000];
const MIN_FRACTION_IN_BAND = 0.6;
const MAX_PERIODICITY_PEAK = 0.4;
const MIN_MONO_COMPATIBILITY = 0.5;
const PERIODICITY_GUARD_SECONDS = 1;
const WINDOW_SECONDS = 0.05;

async function renderRainMix(sampleRateHz: number, durationSeconds: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/noiseProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/modulatorProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/denseGranularProcessor.ts", import.meta.url)
  );

  let seed = 1000;
  for (const id of Object.keys(rain.layers)) {
    const layer = compileLayer(context, rain.layers[id], seed);
    layer.output.gain.setValueAtTime(rain.layers[id].gain, 0);
    layer.output.connect(context.destination);
    seed += 97;
  }

  return context.startRendering();
}

describe("rain — perfil espectral", () => {
  it("concentra al menos el 60% de su energía dentro de la banda declarada (800 Hz - 6 kHz)", async () => {
    const buffer = await renderRainMix(44100, 20);
    const fraction = fractionOfEnergyInBand(buffer.getChannelData(0), 44100, DECLARED_BAND_HZ);

    expect(fraction).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
  });
});

describe("rain — ausencia de periodicidad", () => {
  it("no muestra un pico de autocorrelación de la envolvente por encima del umbral", async () => {
    const buffer = await renderRainMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const guardWindows = Math.round(PERIODICITY_GUARD_SECONDS / WINDOW_SECONDS);
    const peak = maxPeakExcludingZeroLag(autocorrelation, guardWindows);

    expect(peak).toBeLessThan(MAX_PERIODICITY_PEAK);
  }, 60000);
});

describe("rain — compatibilidad mono", () => {
  it("la suma a mono no cancela ninguna capa de forma severa", async () => {
    const buffer = await renderRainMix(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});

describe("rain — independencia de la frecuencia de muestreo", () => {
  it("el mismo criterio espectral se satisface a 44,1 kHz y a 48 kHz", async () => {
    const buffer44 = await renderRainMix(44100, 20);
    const buffer48 = await renderRainMix(48000, 20);

    const fraction44 = fractionOfEnergyInBand(buffer44.getChannelData(0), 44100, DECLARED_BAND_HZ);
    const fraction48 = fractionOfEnergyInBand(buffer48.getChannelData(0), 48000, DECLARED_BAND_HZ);

    expect(fraction44).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
    expect(fraction48).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
    expect(Math.abs(fraction44 - fraction48)).toBeLessThan(0.05);
  });
});
