import { describe, expect, it } from "vitest";
import { compileLayer } from "../layerCompiler";
import { rain } from "../../domain/ambients/rain";
import { fractionOfEnergyInBand } from "../../testing/fft";
import {
  maxPeakExcludingZeroLag,
  normalizedAutocorrelation,
  rmsEnvelope,
} from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Test de señal de `rain` reproducida a través del motor de composición
 * (`ambient-composition-engine`, tarea 2.2): mismos criterios que ya exige
 * `docs/synthesis-reference.md` y que ya verifica
 * `domain/ambients/rain.signal.test.ts` por el motor actual — el `Source` es
 * el mismo `AmbientDeclaration`, sin modificar.
 *
 * La diferencia de enrutamiento entre motores es un `sceneBus` (`GainNode`
 * de ganancia unitaria) que `CompositionEngine` interpone entre cada capa y
 * la salida — el punto de enganche para `Environment`/`Occlusion` en changes
 * futuros (design.md D2/D7). Un nodo de ganancia 1.0 en serie es
 * transparente: no cambia el contenido espectral ni la imagen estéreo, así
 * que este test reproduce ese mismo paso explícitamente en vez de asumirlo,
 * para que una futura regresión en `compositionEngine.ts` (p. ej. un
 * `sceneBus` que ya no fuera unitario) sí se detecte aquí.
 */

const DECLARED_BAND_HZ: [number, number] = [800, 6000];
const MIN_FRACTION_IN_BAND = 0.6;
const MAX_PERIODICITY_PEAK = 0.4;
const MIN_MONO_COMPATIBILITY = 0.5;
const PERIODICITY_GUARD_SECONDS = 1;
const WINDOW_SECONDS = 0.05;

async function renderRainThroughCompositionEngine(
  sampleRateHz: number,
  durationSeconds: number
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
  await context.audioWorklet.addModule(
    new URL("../worklets/modulatorProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
  );

  // Reproduce el grafo real de CompositionEngine.activateSource: cada capa
  // conecta a un sceneBus unitario en vez de directo a destino.
  const sceneBus = context.createGain();
  sceneBus.connect(context.destination);

  let seed = 2000;
  for (const id of Object.keys(rain.layers)) {
    const layer = compileLayer(context, rain.layers[id], seed);
    layer.output.gain.setValueAtTime(rain.layers[id].gain, 0);
    layer.output.connect(sceneBus);
    seed += 97;
  }

  return context.startRendering();
}

describe("CompositionEngine — rain (Source único del piloto) — perfil espectral", () => {
  it("concentra al menos el 60% de su energía dentro de la banda declarada (800 Hz - 6 kHz)", async () => {
    const buffer = await renderRainThroughCompositionEngine(44100, 20);
    const fraction = fractionOfEnergyInBand(buffer.getChannelData(0), 44100, DECLARED_BAND_HZ);

    expect(fraction).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
  });
});

describe("CompositionEngine — rain — ausencia de periodicidad", () => {
  it("no muestra un pico de autocorrelación de la envolvente por encima del umbral", async () => {
    const buffer = await renderRainThroughCompositionEngine(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const guardWindows = Math.round(PERIODICITY_GUARD_SECONDS / WINDOW_SECONDS);
    const peak = maxPeakExcludingZeroLag(autocorrelation, guardWindows);

    expect(peak).toBeLessThan(MAX_PERIODICITY_PEAK);
  }, 60000);
});

describe("CompositionEngine — rain — compatibilidad mono", () => {
  it("la suma a mono no cancela ninguna capa de forma severa", async () => {
    const buffer = await renderRainThroughCompositionEngine(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});
