import { describe, expect, it } from "vitest";
import { findAmbient } from "../../domain/catalog";
import { distancia } from "../../domain/composition/modifiers/distancia";
import { compileLayer } from "../layerCompiler";
import { ModifierStage } from "./modifierStage";
import { fractionOfEnergyInBand, spectralSlopeDbPerOctave } from "../../testing/fft";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de señal del motor de composición con varios `Source` a la vez
 * (`add-multi-source-composition`, grupos 2 y 4), sobre el render real con
 * `OfflineAudioContext` en Chromium — worklets incluidos.
 *
 * Reproducen la topología que implementa `CompositionEngine`: las capas de
 * cada `Source` atraviesan **su propia** `ModifierStage` antes de sumarse en
 * el bus de escena, que es lo que hace que los `Modifiers` pertenezcan al
 * `Source` y no a la escena (`ambient-modifiers`).
 *
 *   Source_a (capas) → ModifierStage_a ─┐
 *   Source_b (capas) → ModifierStage_b ─┴→ sceneBus → destino
 */

const SAMPLE_RATE = 44100;

async function loadWorklets(context: OfflineAudioContext): Promise<void> {
  await context.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
  await context.audioWorklet.addModule(
    new URL("../worklets/modulatorProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../worklets/waveEnvelopeProcessor.ts", import.meta.url)
  );
}

/**
 * Compila las capas de un `Source` sobre su propia `ModifierStage` y devuelve
 * la salida de esa etapa — el punto donde el `Source` ya está modificado y
 * todavía no se ha sumado con nadie.
 */
function buildSourceBranch(
  context: OfflineAudioContext,
  sourceId: string,
  seedBase: number,
  distanceMeters: number | null
): GainNode {
  const ambient = findAmbient(sourceId);
  if (!ambient) throw new Error(`Ambiente desconocido en el test: ${sourceId}`);

  const modifier = new ModifierStage(context);
  let seed = seedBase;
  for (const key of Object.keys(ambient.layers)) {
    const declaration = ambient.layers[key];
    const layer = compileLayer(context, declaration, seed);
    layer.output.gain.setValueAtTime(declaration.gain, 0);
    layer.output.connect(modifier.input);
    seed += 97;
  }

  if (distanceMeters !== null) {
    modifier.activate(distancia, distanceMeters);
  }

  return modifier.output;
}

/** Renderiza varios `Source` sumados en el bus de escena, como hace el motor. */
async function renderScene(
  sources: { id: string; distanceMeters?: number | null }[],
  durationSeconds = 12
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, SAMPLE_RATE * durationSeconds, SAMPLE_RATE);
  await loadWorklets(context);

  const sceneBus = context.createGain();
  sceneBus.connect(context.destination);

  let seedBase = 3000;
  for (const { id, distanceMeters = null } of sources) {
    buildSourceBranch(context, id, seedBase, distanceMeters).connect(sceneBus);
    seedBase += 1013;
  }

  return context.startRendering();
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function peak(samples: Float32Array): number {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  return max;
}

function hasNonFinite(samples: Float32Array): boolean {
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) return true;
  }
  return false;
}

/**
 * Cada `Source` migrado, reproducido por el motor nuevo, contra el mismo
 * criterio espectral declarado que ya cumple por el motor actual — los
 * umbrales se copian de `domain/ambients/<id>.signal.test.ts` a propósito:
 * si el motor nuevo cambiara el reparto espectral, el ambiente dejaría de
 * cumplir lo que `docs/synthesis-reference.md` declara para él.
 */
describe("Motor de composición — cada Source del catálogo cumple su criterio espectral", () => {
  const porBanda: { id: string; band: [number, number]; minFraction: number }[] = [
    { id: "rain", band: [800, 6000], minFraction: 0.6 },
    { id: "wind", band: [150, 3000], minFraction: 0.4 },
    { id: "river", band: [150, 5000], minFraction: 0.7 },
    { id: "ocean", band: [100, 4000], minFraction: 0.45 },
  ];

  for (const { id, band, minFraction } of porBanda) {
    it(`${id} concentra su energía en la banda declarada`, async () => {
      const buffer = await renderScene([{ id }], 20);
      const fraction = fractionOfEnergyInBand(buffer.getChannelData(0), SAMPLE_RATE, band);

      expect(fraction).toBeGreaterThanOrEqual(minFraction);
    }, 60000);
  }

  const porPendiente: { id: string; expectedSlope: number }[] = [
    { id: "white-noise", expectedSlope: 0 },
    { id: "pink-noise", expectedSlope: -3 },
    { id: "brown-noise", expectedSlope: -6 },
  ];

  for (const { id, expectedSlope } of porPendiente) {
    it(`${id} conserva su pendiente espectral de ${expectedSlope} dB/octava`, async () => {
      const buffer = await renderScene([{ id }], 20);
      const slope = spectralSlopeDbPerOctave(buffer.getChannelData(0), SAMPLE_RATE, [100, 8000]);

      expect(Math.abs(slope - expectedSlope)).toBeLessThanOrEqual(1);
    }, 60000);
  }
});

describe("Motor de composición — escena con varios Source (tarea 4.5)", () => {
  it("el catálogo completo sonando a la vez produce señal acotada y sin valores no finitos", async () => {
    const buffer = await renderScene(
      [
        { id: "rain" },
        { id: "wind" },
        { id: "river" },
        { id: "ocean" },
        { id: "white-noise" },
        { id: "pink-noise" },
        { id: "brown-noise" },
      ],
      12
    );

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    expect(hasNonFinite(left)).toBe(false);
    expect(hasNonFinite(right)).toBe(false);
    // Hay señal de verdad, no silencio: un test que solo comprobara "acotado"
    // pasaria con un buffer de ceros.
    expect(rms(left)).toBeGreaterThan(0.001);
    // El limitador del motor va despues de este punto, asi que aqui solo se
    // exige que la suma no diverja de forma absurda antes de llegar a el.
    expect(peak(left)).toBeLessThan(8);
  }, 120000);

  it("la suma de varios Source no cancela al colapsar a mono", async () => {
    const buffer = await renderScene([{ id: "rain" }, { id: "wind" }, { id: "river" }], 12);
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));

    expect(ratio).toBeGreaterThan(0.5);
  }, 60000);

  it("añadir un Source aumenta la energía en vez de sustituirla", async () => {
    const solo = await renderScene([{ id: "rain" }], 10);
    const acompanado = await renderScene([{ id: "rain" }, { id: "river" }], 10);

    expect(rms(acompanado.getChannelData(0))).toBeGreaterThan(rms(solo.getChannelData(0)));
  }, 90000);
});

/**
 * El test central del grupo 2: demuestra sobre el render real que el
 * `Modifier` pertenece al `Source`.
 *
 * Cada rama se enruta a un canal propio mediante un `ChannelMerger`, así que
 * la contribución de cada `Source` es medible por separado dentro de la misma
 * escena — que es justo lo que no se puede hacer midiendo la mezcla ya
 * sumada. Si la `ModifierStage` volviera a ser compartida (aguas abajo de la
 * suma), alejar un `Source` movería también al otro y el canal de control
 * cambiaría.
 */
async function renderSeparatedBranches(rainMeters: number | null): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, SAMPLE_RATE * 10, SAMPLE_RATE);
  await loadWorklets(context);

  const merger = context.createChannelMerger(2);
  merger.connect(context.destination);

  // Canal 0: `wind`, nunca modificado — es el control.
  buildSourceBranch(context, "wind", 7000, null).connect(merger, 0, 0);
  // Canal 1: `rain`, con o sin `Modifier` de distancia.
  buildSourceBranch(context, "rain", 8000, rainMeters).connect(merger, 0, 1);

  return context.startRendering();
}

describe("Motor de composición — el Modifier pertenece al Source (tarea 2.4)", () => {
  it("alejar un Source no altera la señal del otro", async () => {
    const sinModifier = await renderSeparatedBranches(null);
    const conModifierLejano = await renderSeparatedBranches(180);

    const controlA = sinModifier.getChannelData(0);
    const controlB = conModifierLejano.getChannelData(0);

    // El canal de control es `wind`, con la misma semilla en ambos renders y
    // sin `Modifier` en ninguno: su señal tiene que ser la misma. Se compara
    // el nivel y el reparto espectral, no muestra a muestra, para no atar el
    // test a la reproducibilidad exacta del renderizador.
    const rmsA = rms(controlA);
    const rmsB = rms(controlB);
    expect(Math.abs(rmsA - rmsB) / rmsA).toBeLessThan(0.01);

    const bandA = fractionOfEnergyInBand(controlA, SAMPLE_RATE, [150, 3000]);
    const bandB = fractionOfEnergyInBand(controlB, SAMPLE_RATE, [150, 3000]);
    expect(Math.abs(bandA - bandB)).toBeLessThan(0.01);
  }, 90000);

  it("el Source alejado sí cambia: baja de nivel y pierde agudos", async () => {
    const cerca = await renderSeparatedBranches(2);
    const lejos = await renderSeparatedBranches(180);

    const cercaCh = cerca.getChannelData(1);
    const lejosCh = lejos.getChannelData(1);

    expect(rms(lejosCh)).toBeLessThan(rms(cercaCh));

    // Lo que distingue alejarse de bajar el volumen: la absorción atmosférica
    // se lleva los agudos, así que la *fracción* de energía en agudos cae,
    // no solo el nivel.
    const agudosCerca = fractionOfEnergyInBand(cercaCh, SAMPLE_RATE, [4000, 12000]);
    const agudosLejos = fractionOfEnergyInBand(lejosCh, SAMPLE_RATE, [4000, 12000]);
    expect(agudosLejos).toBeLessThan(agudosCerca);
  }, 90000);
});
