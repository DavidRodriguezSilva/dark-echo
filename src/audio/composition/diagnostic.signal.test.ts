import { describe, it } from "vitest";
import { cabana } from "../../domain/composition/environments/cabana";
import { techoMadera } from "../../domain/composition/occlusions/techoMadera";
import { ventanaVidrio } from "../../domain/composition/occlusions/ventanaVidrio";
import { rain } from "../../domain/ambients/rain";
import { plateModes } from "../../dsp/acoustics";
import { compileLayer } from "../layerCompiler";
import { EnvironmentStage } from "./environmentStage";
import { OcclusionStage } from "./occlusionStage";
import { spectralPeakToMedian } from "../../testing/tonality";
import { fractionOfEnergyInBand } from "../../testing/fft";

/** DIAGNOSTICO TEMPORAL: localizar el sonido de "arco electrico" reportado por escucha. */

const SR = 44100;

function rms(x: Float32Array): number {
  let t = 0;
  for (let i = 0; i < x.length; i++) t += x[i] * x[i];
  return Math.sqrt(t / x.length);
}


async function render(opts: {
  occlusion?: typeof techoMadera | null;
  environment?: typeof cabana | null;
  seconds?: number;
}): Promise<AudioBuffer> {
  const seconds = opts.seconds ?? 8;
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  await ctx.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
  await ctx.audioWorklet.addModule(new URL("../worklets/modulatorProcessor.ts", import.meta.url));
  await ctx.audioWorklet.addModule(
    new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
  );

  const sourceBus = ctx.createGain();
  const occ = new OcclusionStage(ctx);
  const env = new EnvironmentStage(ctx, 11);
  sourceBus.connect(occ.input);
  occ.output.connect(env.input);
  env.output.connect(ctx.destination);

  let seed = 5000;
  for (const k of Object.keys(rain.layers)) {
    const l = compileLayer(ctx, rain.layers[k], seed);
    l.output.gain.setValueAtTime(rain.layers[k].gain, 0);
    l.output.connect(sourceBus);
    seed += 97;
  }
  if (opts.occlusion) occ.activate(opts.occlusion);
  if (opts.environment) env.activate(opts.environment);
  return ctx.startRendering();
}

describe("DIAGNOSTICO", () => {
  it("modos compilados y tonalidad por configuracion", async () => {
    const modosMadera = plateModes(
      techoMadera.resonance!.geometry,
      techoMadera.resonance!.material,
      6
    );
    const modosVidrio = plateModes(
      ventanaVidrio.resonance!.geometry,
      ventanaVidrio.resonance!.material,
      6
    );
    console.warn(
      "[modos madera] " +
        modosMadera.map((m) => `${m.frequencyHz.toFixed(0)}Hz Q=${m.q}`).join(", ")
    );
    console.warn(
      "[modos vidrio] " +
        modosVidrio.map((m) => `${m.frequencyHz.toFixed(0)}Hz Q=${m.q}`).join(", ")
    );

    const casos: [string, Parameters<typeof render>[0]][] = [
      ["rain sola", {}],
      ["rain + cabana", { environment: cabana }],
      ["rain + techo-madera", { occlusion: techoMadera }],
      ["rain + ventana-vidrio", { occlusion: ventanaVidrio }],
      ["rain + cabana + techo", { environment: cabana, occlusion: techoMadera }],
    ];

    for (const [nombre, opts] of casos) {
      const buf = await render(opts);
      const ch = buf.getChannelData(0);
      const enBanda = spectralPeakToMedian(ch, SR, [100, 8000]);
      const completo = spectralPeakToMedian(ch, SR, [10, 20000]);
      console.warn(
        `[${nombre}] rms=${rms(ch as Float32Array).toFixed(5)} ` +
          `tonalidad_100-8k=${enBanda.ratio.toFixed(1)}@${enBanda.peakHz.toFixed(0)}Hz ` +
          `tonalidad_total=${completo.ratio.toFixed(1)}@${completo.peakHz.toFixed(0)}Hz ` +
          `sub80Hz=${(fractionOfEnergyInBand(ch, SR, [0, 80]) * 100).toFixed(1)}% ` +
          `banda_rain=${(fractionOfEnergyInBand(ch, SR, [800, 6000]) * 100).toFixed(1)}%`
      );
    }
  }, 180000);
});
