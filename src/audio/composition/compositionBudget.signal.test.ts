import { describe, expect, it } from "vitest";
import { cabana } from "../../domain/composition/environments/cabana";
import { techoMadera } from "../../domain/composition/occlusions/techoMadera";
import { distancia } from "../../domain/composition/modifiers/distancia";
import { rain } from "../../domain/ambients/rain";
import { compileLayer } from "../layerCompiler";
import { EnvironmentStage } from "./environmentStage";
import { ModifierStage } from "./modifierStage";
import { OcclusionStage } from "./occlusionStage";

/**
 * Presupuesto de computo del motor de composicion (tarea 8.3).
 *
 * El motor nuevo **no hereda** la medicion del motor actual: anade una
 * convolucion y un banco de resonadores que el motor de capas no tiene, asi
 * que su coste hay que medirlo, no suponerlo. Este test mide el factor de
 * tiempo real de la escena mas cargada que el piloto puede montar y deja el
 * numero registrado en docs/synthesis-reference.md.
 */

const SAMPLE_RATE = 44100;
const RENDER_SECONDS = 30;

/**
 * Cota del factor de tiempo real. Es holgada a proposito: mide tiempo de
 * reloj en un Chromium headless compartido con el resto de la suite, asi que
 * sirve para detectar una regresion de orden de magnitud -- una convolucion
 * que se dispare, un banco de resonadores que crezca sin control -- no para
 * fijar el numero exacto, que se registra en la documentacion.
 */
const MAX_REALTIME_FACTOR = 0.5;

describe("Presupuesto de computo del motor de composicion (tarea 8.3)", () => {
  it("la escena completa del piloto se renderiza muy por encima de tiempo real", async () => {
    const started = performance.now();

    const context = new OfflineAudioContext(2, SAMPLE_RATE * RENDER_SECONDS, SAMPLE_RATE);
    await context.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
    await context.audioWorklet.addModule(
      new URL("../worklets/modulatorProcessor.ts", import.meta.url)
    );
    await context.audioWorklet.addModule(
      new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
    );

    const sourceBus = context.createGain();
    const modifierStage = new ModifierStage(context);
    const occlusionStage = new OcclusionStage(context);
    const environmentStage = new EnvironmentStage(context, 99);

    sourceBus.connect(modifierStage.input);
    modifierStage.output.connect(occlusionStage.input);
    occlusionStage.output.connect(environmentStage.input);
    environmentStage.output.connect(context.destination);

    let seed = 7000;
    for (const key of Object.keys(rain.layers)) {
      const layer = compileLayer(context, rain.layers[key], seed);
      layer.output.gain.setValueAtTime(rain.layers[key].gain, 0);
      layer.output.connect(sourceBus);
      seed += 97;
    }

    environmentStage.activate(cabana);
    occlusionStage.activate(techoMadera);
    modifierStage.activate(distancia, 20);

    const buffer = await context.startRendering();
    const elapsedSeconds = (performance.now() - started) / 1000;
    const realtimeFactor = elapsedSeconds / RENDER_SECONDS;

    console.warn(
      `[presupuesto] escena completa: ${elapsedSeconds.toFixed(3)} s de reloj para ` +
        `${RENDER_SECONDS} s de audio -> factor de tiempo real ${realtimeFactor.toFixed(4)} ` +
        `(${(1 / realtimeFactor).toFixed(1)}x mas rapido que tiempo real)`
    );

    expect(buffer.length).toBe(SAMPLE_RATE * RENDER_SECONDS);
    expect(realtimeFactor).toBeLessThan(MAX_REALTIME_FACTOR);
  }, 120000);

  it("el banco de resonadores no crece sin control: los modos compilados estan acotados", () => {
    const context = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
    const stage = new OcclusionStage(context);

    stage.activate(techoMadera);

    // El numero de modos lo declara la oclusion (`modeCount`), no lo decide
    // el runtime: es la cota explicita del coste de este camino.
    expect(stage.activeModeFrequenciesHz.length).toBe(techoMadera.resonance!.modeCount);
    expect(stage.activeModeFrequenciesHz.length).toBeLessThanOrEqual(8);
  });
});
