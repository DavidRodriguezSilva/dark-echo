import { describe, expect, it } from "vitest";
import { cabana } from "../../domain/composition/environments/cabana";
import { casa } from "../../domain/composition/environments/casa";
import { techoMadera, techoMaderaGrueso } from "../../domain/composition/occlusions/techoMadera";
import { ventanaVidrio } from "../../domain/composition/occlusions/ventanaVidrio";
import type { OcclusionDeclaration } from "../../domain/composition/occlusion";
import type { EnvironmentDeclaration } from "../../domain/composition/environment";
import { rain } from "../../domain/ambients/rain";
import { compileLayer } from "../layerCompiler";
import { EnvironmentStage } from "./environmentStage";
import { OcclusionStage } from "./occlusionStage";
import { fractionOfEnergyInBand } from "../../testing/fft";
import { spectralPeakToMedian } from "../../testing/tonality";

/**
 * Regresion del defecto de "arco electrico" (encontrado por escucha, no por
 * ningun test).
 *
 * La primera version del banco resonante sonaba como un zumbido electrico. La
 * suite de senal entera pasaba: todos los criterios existentes miden
 * *fraccion de energia en banda*, y un tono dentro de la banda correcta la
 * satisface igual de bien que el ruido de banda ancha que se buscaba. Este
 * archivo anade los dos criterios que si lo detectan, y que faltaban:
 *
 * 1. **Tonalidad**: ningun pico estrecho debe dominar la banda audible util.
 *    Una `Occlusion` colorea la lluvia; no le anade un tono.
 * 2. **Reparto de energia**: la barrera no debe desplazar la escena hacia una
 *    banda donde el `Source` no tiene contenido modelado.
 *
 * Los umbrales se calibran contra `rain` sin ocluir, que es la referencia de
 * "esto es ruido de banda ancha, no un tono": se admite que una barrera suba
 * la tonalidad, pero no que cambie de categoria.
 */

const SR = 44100;
const AUDIBLE_BAND_HZ: [number, number] = [100, 8000];

/**
 * Margen sobre la tonalidad de `rain` sin ocluir. Una barrera con resonancia
 * propia concentra algo de energia en sus modos -- eso es el fenomeno, no un
 * defecto -- pero un factor 3 ya distingue "color" de "tono": la version con
 * el zumbido medía 12 veces la referencia dentro de esta misma banda, y mas
 * de 600 veces sobre el espectro completo.
 */
const MAX_TONALITY_FACTOR = 3;

/**
 * Fraccion maxima de energia por debajo de 80 Hz. `rain` sin ocluir mide un
 * 2%: ahi no hay fenomeno modelado (`impacto-gota` no describe nada por
 * debajo de 1 kHz), solo suelo de ruido de los generadores. Una barrera
 * favorece los graves -- es correcto y audible -- pero si se lleva la mayoria
 * de la energia a esa zona, lo que esta amplificando es el residuo: la
 * version anterior llegaba al 50%.
 */
const MAX_SUB_BASS_FRACTION = 0.25;

/** Fraccion minima de energia que debe quedar en la banda propia de `rain`. */
const MIN_RAIN_BAND_FRACTION = 0.4;

async function renderScene(
  occlusion: OcclusionDeclaration | null,
  environment: EnvironmentDeclaration | null
): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(2, SR * 8, SR);
  await ctx.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
  await ctx.audioWorklet.addModule(new URL("../worklets/modulatorProcessor.ts", import.meta.url));
  await ctx.audioWorklet.addModule(
    new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
  );

  const sourceBus = ctx.createGain();
  const occlusionStage = new OcclusionStage(ctx);
  const environmentStage = new EnvironmentStage(ctx, 11);
  sourceBus.connect(occlusionStage.input);
  occlusionStage.output.connect(environmentStage.input);
  environmentStage.output.connect(ctx.destination);

  let seed = 5000;
  for (const key of Object.keys(rain.layers)) {
    const layer = compileLayer(ctx, rain.layers[key], seed);
    layer.output.gain.setValueAtTime(rain.layers[key].gain, 0);
    layer.output.connect(sourceBus);
    seed += 97;
  }
  if (occlusion) occlusionStage.activate(occlusion);
  if (environment) environmentStage.activate(environment);

  const buffer = await ctx.startRendering();
  return buffer.getChannelData(0);
}

describe("Occlusion — no introduce un tono (regresion del zumbido)", () => {
  it("ninguna barrera del catalogo eleva la tonalidad a otra categoria", async () => {
    const referencia = spectralPeakToMedian(await renderScene(null, null), SR, AUDIBLE_BAND_HZ);
    const limite = referencia.ratio * MAX_TONALITY_FACTOR;

    const combinaciones: [string, OcclusionDeclaration, EnvironmentDeclaration | null][] = [
      ["techo-madera", techoMadera, null],
      ["techo-madera-grueso", techoMaderaGrueso, null],
      ["ventana-vidrio", ventanaVidrio, null],
      ["techo-madera + cabana", techoMadera, cabana],
      ["ventana-vidrio + casa", ventanaVidrio, casa],
    ];

    for (const [nombre, occlusion, environment] of combinaciones) {
      const medida = spectralPeakToMedian(
        await renderScene(occlusion, environment),
        SR,
        AUDIBLE_BAND_HZ
      );
      expect(
        medida.ratio,
        `${nombre}: tonalidad ${medida.ratio.toFixed(1)} en ${medida.peakHz.toFixed(0)} Hz`
      ).toBeLessThan(limite);
    }
  }, 180000);
});

describe("Occlusion — no desplaza la escena fuera de la banda del Source", () => {
  it("la energia no se acumula por debajo de 80 Hz, donde el Source no modela nada", async () => {
    const combinaciones: [string, OcclusionDeclaration, EnvironmentDeclaration | null][] = [
      ["techo-madera", techoMadera, null],
      ["ventana-vidrio", ventanaVidrio, null],
      ["techo-madera + cabana", techoMadera, cabana],
    ];

    for (const [nombre, occlusion, environment] of combinaciones) {
      const channel = await renderScene(occlusion, environment);
      const subBass = fractionOfEnergyInBand(channel, SR, [0, 80]);
      const rainBand = fractionOfEnergyInBand(channel, SR, [800, 6000]);

      expect(subBass, `${nombre}: ${(subBass * 100).toFixed(1)}% por debajo de 80 Hz`).toBeLessThan(
        MAX_SUB_BASS_FRACTION
      );
      expect(
        rainBand,
        `${nombre}: solo ${(rainBand * 100).toFixed(1)}% en la banda de rain`
      ).toBeGreaterThan(MIN_RAIN_BAND_FRACTION);
    }
  }, 180000);

  it("la barrera atenua, pero no hasta hacerse inaudible", async () => {
    // El reverso del criterio anterior. Una barrera demasiado severa fue un
    // defecto real reportado por escucha ("no se oyen del todo, es como si
    // atenuara casi todo el sonido"): con el suelo de flanking en -24 dB, la
    // banda propia de la lluvia quedaba tan baja que la escena dejaba de ser
    // reconocible. Se acota por los dos lados.
    //
    // Deliberadamente **no** se comprueba que el pico espectral siga en la
    // frecuencia que tiene `rain` sin ocluir: eso equivaldria a exigir que la
    // barrera no cambie el balance espectral, que es justo lo contrario de lo
    // que una barrera hace. El criterio de que siga sonando a lluvia es la
    // fraccion de energia que conserva en su banda, ya cubierta arriba.
    const referencia = await renderScene(null, null);
    const ocluida = await renderScene(techoMadera, cabana);

    const rmsOf = (x: Float32Array) => {
      let t = 0;
      for (let i = 0; i < x.length; i++) t += x[i] * x[i];
      return Math.sqrt(t / x.length);
    };
    const nivelDb = 20 * Math.log10(rmsOf(ocluida) / rmsOf(referencia));

    expect(nivelDb, `la oclusion deja la escena en ${nivelDb.toFixed(1)} dB`).toBeGreaterThan(-15);
    expect(nivelDb).toBeLessThan(6);
  }, 120000);
});
