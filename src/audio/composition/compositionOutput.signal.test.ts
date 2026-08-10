import { describe, expect, it } from "vitest";
import { rain } from "../../domain/ambients/rain";
import { compileLayer } from "../layerCompiler";
import { EnvironmentStage } from "./environmentStage";
import { ModifierStage } from "./modifierStage";
import { OcclusionStage } from "./occlusionStage";

/**
 * Regresion de la cadena de salida del motor de composicion (defecto
 * reportado por escucha: "se oye una saturacion, como picos o bajonazos").
 *
 * Dos huecos de cobertura que este archivo cierra, y que explican por que
 * nada lo detecto:
 *
 * 1. **Los tests de senal existentes conectan las capas directamente al
 *    destino**, saltandose el nodo maestro y el limitador. El motor nuevo
 *    dejaba el maestro en su ganancia por defecto (1.0) mientras el motor
 *    actual usa 0.5: sonaba al doble, con las capas de `rain` sumando 1.35 de
 *    ganancia declarada. Ningun test podia verlo.
 * 2. **Nadie comprobaba que una etapa inactiva fuera transparente.** El
 *    `Modifier` dejaba un pasa-bajos permanentemente en la cadena con el
 *    corte en 20 kHz -- 0.9 de Nyquist --, donde un biquad distorsiona la
 *    fase aunque su magnitud sea plana: subia el pico y el factor de cresta
 *    un 13% con el `Modifier` apagado.
 *
 * El criterio de aqui es el mas fuerte que tiene sentido para el segundo
 * caso: con todos los componentes inactivos, la cadena completa debe
 * coincidir con la directa hasta la precision de float32. No se exige
 * igualdad binaria exacta porque atravesar varias ganancias unitarias y sumar
 * caminos en paralelo reordena las operaciones en coma flotante; la
 * diferencia residual medida es de 1.5e-8, uno o dos ULP de float32 -- unos
 * -156 dB --, frente a los -21.9 dB que dejaba el pasa-bajos mal colocado.
 */

const SR = 44100;

async function renderPair(): Promise<{ directo: Float32Array; viaEtapas: Float32Array }> {
  const render = async (viaEtapas: boolean): Promise<Float32Array> => {
    const ctx = new OfflineAudioContext(2, SR * 6, SR);
    await ctx.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
    await ctx.audioWorklet.addModule(new URL("../worklets/modulatorProcessor.ts", import.meta.url));
    await ctx.audioWorklet.addModule(
      new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
    );

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    let target: AudioNode = master;
    if (viaEtapas) {
      const sourceBus = ctx.createGain();
      const modifier = new ModifierStage(ctx);
      const occlusion = new OcclusionStage(ctx);
      const environment = new EnvironmentStage(ctx, 11);
      sourceBus.connect(modifier.input);
      modifier.output.connect(occlusion.input);
      occlusion.output.connect(environment.input);
      environment.output.connect(master);
      target = sourceBus;
    }

    let seed = 5000;
    for (const key of Object.keys(rain.layers)) {
      const layer = compileLayer(ctx, rain.layers[key], seed);
      layer.output.gain.setValueAtTime(rain.layers[key].gain, 0);
      layer.output.connect(target);
      seed += 97;
    }

    const buffer = await ctx.startRendering();
    return buffer.getChannelData(0);
  };

  return { directo: await render(false), viaEtapas: await render(true) };
}

describe("Cadena de composición — transparencia con todo inactivo", () => {
  it("con Environment, Occlusion y Modifier inactivos, la cadena es idéntica a la directa", async () => {
    const { directo, viaEtapas } = await renderPair();

    let maxDifference = 0;
    for (let i = 0; i < directo.length; i++) {
      maxDifference = Math.max(maxDifference, Math.abs(viaEtapas[i] - directo[i]));
    }

    // Margen de redondeo de float32, no de tolerancia perceptual: cualquier
    // etapa que de verdad procese algo dejaria una diferencia muchos ordenes
    // de magnitud mayor.
    expect(maxDifference).toBeLessThan(1e-6);
  }, 120000);

  it("no altera el factor de cresta: la etapa inactiva no afila los transitorios", async () => {
    const { directo, viaEtapas } = await renderPair();

    const crest = (x: Float32Array) => {
      let peak = 0;
      let energy = 0;
      for (let i = 0; i < x.length; i++) {
        peak = Math.max(peak, Math.abs(x[i]));
        energy += x[i] * x[i];
      }
      return peak / Math.sqrt(energy / x.length);
    };

    expect(crest(viaEtapas)).toBeCloseTo(crest(directo), 6);
  }, 120000);
});

describe("Cadena de composición — margen frente al limitador", () => {
  it("la escena más cargada no empuja el limitador a bombear", async () => {
    // El limitador de `audio-engine` tiene el umbral en -1 dBFS (0.891). Si la
    // senal lo supera, reduce ganancia sobre cada transitorio y el resultado
    // se oye como "picos y bajonazos". Con el maestro en 0.5, `rain` completa
    // debe quedar con margen de sobra.
    const { viaEtapas } = await renderPair();

    let peak = 0;
    for (let i = 0; i < viaEtapas.length; i++) peak = Math.max(peak, Math.abs(viaEtapas[i]));

    const LIMITER_THRESHOLD = Math.pow(10, -1 / 20);
    expect(peak).toBeLessThan(LIMITER_THRESHOLD);
  }, 120000);
});
