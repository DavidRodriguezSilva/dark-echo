import { describe, expect, it } from "vitest";
import { compileLayer } from "../../audio/layerCompiler";
import { ocean } from "./ocean";
import { fractionOfEnergyInBand } from "../../testing/fft";
import { normalizedAutocorrelation, rmsEnvelope } from "../../testing/autocorrelation";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de `ocean` (tarea 10.4). El oleaje es un caso distinto de
 * rain/wind/river: su ritmo es autentico -- las olas reales tienen periodo
 * -- asi que "ausencia de periodicidad" no es el criterio correcto. Lo que
 * importa es que un ciclo no sea identico al anterior: se verifica que la
 * autocorrelacion de la envolvente en el propio periodo de la ola quede
 * lejos de 1 (recurrencia exacta), no que sea baja en general.
 */

const DECLARED_BAND_HZ: [number, number] = [100, 4000];
const MIN_FRACTION_IN_BAND = 0.45;
const MIN_MONO_COMPATIBILITY = 0.5;
const WAVE_PERIOD_SECONDS = 7;
const MAX_CORRELATION_AT_WAVE_PERIOD = 0.85;
// Cota inferior (refinamiento del catalogo, ocean): sin ella, una futura
// regresion que aplanara el oleaje hasta volverlo irreconocible seguiria
// pasando este test con tal de no acercarse a una recurrencia exacta. El
// valor medido tras profundizar la modulacion es 0.636; el umbral deja
// margen por debajo sin permitir que el oleaje deje de percibirse.
const MIN_CORRELATION_AT_WAVE_PERIOD = 0.5;
const WINDOW_SECONDS = 0.05;

async function renderOceanMix(sampleRateHz: number, durationSeconds: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, sampleRateHz * durationSeconds, sampleRateHz);
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/noiseProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../../audio/worklets/waveEnvelopeProcessor.ts", import.meta.url)
  );

  let seed = 5000;
  for (const id of Object.keys(ocean.layers)) {
    const layer = compileLayer(context, ocean.layers[id], seed);
    layer.output.gain.setValueAtTime(ocean.layers[id].gain, 0);
    layer.output.connect(context.destination);
    seed += 97;
  }

  return context.startRendering();
}

describe("ocean — perfil espectral", () => {
  it("concentra al menos el 45% de su energía dentro de la banda declarada (100 Hz - 4 kHz)", async () => {
    const buffer = await renderOceanMix(44100, 20);
    const fraction = fractionOfEnergyInBand(buffer.getChannelData(0), 44100, DECLARED_BAND_HZ);

    expect(fraction).toBeGreaterThanOrEqual(MIN_FRACTION_IN_BAND);
  });
});

describe("ocean — el oleaje no repite un ciclo idéntico", () => {
  it("la autocorrelación de la envolvente en el periodo de la ola queda por debajo de una recurrencia exacta", async () => {
    const buffer = await renderOceanMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const lagAtPeriod = Math.round(WAVE_PERIOD_SECONDS / WINDOW_SECONDS);

    expect(Math.abs(autocorrelation[lagAtPeriod])).toBeLessThan(MAX_CORRELATION_AT_WAVE_PERIOD);
  }, 60000);

  it("el oleaje sigue siendo reconocible: la correlación en su periodo no se aplana hasta desaparecer", async () => {
    const buffer = await renderOceanMix(44100, 150);
    const left = buffer.getChannelData(0);

    const windowSize = Math.round(WINDOW_SECONDS * 44100);
    const envelope = rmsEnvelope(left, windowSize);
    const autocorrelation = normalizedAutocorrelation(envelope);
    const lagAtPeriod = Math.round(WAVE_PERIOD_SECONDS / WINDOW_SECONDS);

    expect(Math.abs(autocorrelation[lagAtPeriod])).toBeGreaterThan(MIN_CORRELATION_AT_WAVE_PERIOD);
  }, 60000);
});

describe("ocean — compatibilidad mono", () => {
  it("la suma a mono no cancela ninguna capa de forma severa", async () => {
    const buffer = await renderOceanMix(44100, 20);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(MIN_MONO_COMPATIBILITY);
  });
});
