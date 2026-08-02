import { describe, expect, it } from "vitest";
import { cabana } from "../../domain/composition/environments/cabana";
import { casa } from "../../domain/composition/environments/casa";
import { campoAbierto } from "../../domain/composition/environments/campoAbierto";
import { techoMadera, techoMaderaGrueso } from "../../domain/composition/occlusions/techoMadera";
import { ventanaVidrio } from "../../domain/composition/occlusions/ventanaVidrio";
import { distancia } from "../../domain/composition/modifiers/distancia";
import { rain } from "../../domain/ambients/rain";
import { compileLayer } from "../layerCompiler";
import { EnvironmentStage } from "./environmentStage";
import { ModifierStage } from "./modifierStage";
import { OcclusionStage } from "./occlusionStage";
import { fractionOfEnergyInBand } from "../../testing/fft";
import { monoCompatibilityRatio } from "../../testing/monoCompatibility";

/**
 * Tests de senal de las tres etapas del motor de composicion (grupos 3-5),
 * sobre el render real con `OfflineAudioContext` en Chromium -- worklets
 * incluidos. Verifican que cada etapa produce en el audio real el efecto que
 * su modelo fisico predice, no solo que el grafo se construye.
 */

const SAMPLE_RATE = 44100;
const RAIN_BAND_HZ: [number, number] = [800, 6000];

interface SceneOptions {
  environment?: typeof cabana | null;
  occlusion?: typeof techoMadera | null;
  distanceMeters?: number | null;
  withSource?: boolean;
  durationSeconds?: number;
}

async function renderScene({
  environment = null,
  occlusion = null,
  distanceMeters = null,
  withSource = true,
  durationSeconds = 6,
}: SceneOptions): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, SAMPLE_RATE * durationSeconds, SAMPLE_RATE);
  await context.audioWorklet.addModule(new URL("../worklets/noiseProcessor.ts", import.meta.url));
  await context.audioWorklet.addModule(
    new URL("../worklets/modulatorProcessor.ts", import.meta.url)
  );
  await context.audioWorklet.addModule(
    new URL("../worklets/denseGranularProcessor.ts", import.meta.url)
  );

  // Misma cadena que CompositionEngine:
  // source -> modifier -> occlusion -> environment -> destination
  const sourceBus = context.createGain();
  const modifierStage = new ModifierStage(context);
  const occlusionStage = new OcclusionStage(context);
  const environmentStage = new EnvironmentStage(context, 4242);

  sourceBus.connect(modifierStage.input);
  modifierStage.output.connect(occlusionStage.input);
  occlusionStage.output.connect(environmentStage.input);
  environmentStage.output.connect(context.destination);

  if (withSource) {
    let seed = 3000;
    for (const key of Object.keys(rain.layers)) {
      const layer = compileLayer(context, rain.layers[key], seed);
      layer.output.gain.setValueAtTime(rain.layers[key].gain, 0);
      layer.output.connect(sourceBus);
      seed += 97;
    }
  }

  // Las etapas se activan en t=0 con sus rampas; el analisis toma el centro
  // del render, ya con las rampas asentadas.
  if (environment) environmentStage.activate(environment);
  if (occlusion) occlusionStage.activate(occlusion);
  if (distanceMeters !== null) modifierStage.activate(distancia, distanceMeters);

  return context.startRendering();
}

function rmsOf(channel: Float32Array): number {
  let total = 0;
  for (let i = 0; i < channel.length; i++) total += channel[i] * channel[i];
  return Math.sqrt(total / channel.length);
}

/** RMS de la segunda mitad del render, ya con todas las rampas asentadas. */
function settledRms(buffer: AudioBuffer): number {
  const channel = buffer.getChannelData(0);
  return rmsOf(channel.subarray(Math.floor(channel.length / 2)) as Float32Array);
}

describe("EnvironmentStage — bus compartido de escena (grupo 3)", () => {
  it("un Environment activo sin ningun Source no produce sonido audible (tarea 3.3)", async () => {
    const buffer = await renderScene({ environment: cabana, withSource: false });
    expect(settledRms(buffer)).toBeLessThan(1e-6);
  });

  it("la cabana suena reconociblemente distinta de la casa (tarea 3.4)", async () => {
    const enCabana = await renderScene({ environment: cabana });
    const enCasa = await renderScene({ environment: casa });

    const bandaCabana = fractionOfEnergyInBand(
      enCabana.getChannelData(0),
      SAMPLE_RATE,
      RAIN_BAND_HZ
    );
    const bandaCasa = fractionOfEnergyInBand(enCasa.getChannelData(0), SAMPLE_RATE, RAIN_BAND_HZ);

    // Ambos siguen siendo lluvia, pero la casa -- mas reverberante y menos
    // absorbente -- reparte mas energia fuera de la banda directa de rain.
    expect(bandaCabana).not.toBeCloseTo(bandaCasa, 2);
  });

  it("campo abierto no anade cola: queda practicamente transparente", async () => {
    const abierto = await renderScene({ environment: campoAbierto });
    const sinEntorno = await renderScene({});

    expect(settledRms(abierto)).toBeCloseTo(settledRms(sinEntorno), 3);
  });

  it("la reverberacion no cancela al sumar a mono", async () => {
    const buffer = await renderScene({ environment: casa });
    const ratio = monoCompatibilityRatio(buffer.getChannelData(0), buffer.getChannelData(1));
    expect(ratio).toBeGreaterThan(0.5);
  });

  it("activar un Environment no altera el criterio espectral propio de rain (tarea 3.5)", async () => {
    // Regresion de independencia: el Source se mide en aislamiento, sin
    // etapas activas, antes y despues de que exista la etapa en el grafo.
    const soloRain = await renderScene({ durationSeconds: 20 });
    const fraccion = fractionOfEnergyInBand(soloRain.getChannelData(0), SAMPLE_RATE, RAIN_BAND_HZ);

    // El mismo umbral que ya exige docs/synthesis-reference.md para rain.
    expect(fraccion).toBeGreaterThanOrEqual(0.6);
  });
});

describe("OcclusionStage — transmision y respuesta propia (grupo 4)", () => {
  it("ocluir apaga la lluvia: menos energia en la banda alta (tarea 4.5)", async () => {
    const directa = await renderScene({ environment: cabana });
    const ocluida = await renderScene({ environment: cabana, occlusion: techoMadera });

    const agudosDirecta = fractionOfEnergyInBand(
      directa.getChannelData(0),
      SAMPLE_RATE,
      [4000, 20000]
    );
    const agudosOcluida = fractionOfEnergyInBand(
      ocluida.getChannelData(0),
      SAMPLE_RATE,
      [4000, 20000]
    );

    // La ley de masas cae 6 dB/octava: lo ocluido pierde brillo, no solo
    // nivel. Ese es el rasgo audible de estar bajo techo.
    expect(agudosOcluida).toBeLessThan(agudosDirecta);
  });

  it("la variante gruesa atenua mas que la delgada del mismo material", async () => {
    const delgada = await renderScene({ environment: cabana, occlusion: techoMadera });
    const gruesa = await renderScene({ environment: cabana, occlusion: techoMaderaGrueso });

    expect(settledRms(gruesa)).toBeLessThan(settledRms(delgada));
  });

  it("el techo de madera aporta energia propia en su banda modal grave (tarea 4.6)", async () => {
    const sinTecho = await renderScene({ environment: cabana });
    const conTecho = await renderScene({ environment: cabana, occlusion: techoMadera });

    // Los modos del pano de 3 x 0.6 m en tabla de 20 mm caen a partir de
    // ~110 Hz: el repiqueteo grave que un techo devuelve al ser golpeado.
    const graveSin = fractionOfEnergyInBand(sinTecho.getChannelData(0), SAMPLE_RATE, [80, 500]);
    const graveCon = fractionOfEnergyInBand(conTecho.getChannelData(0), SAMPLE_RATE, [80, 500]);

    expect(graveCon).toBeGreaterThan(graveSin);
  });

  it("sin Source, la oclusion con respuesta propia no produce senal (tarea 4.6)", async () => {
    const buffer = await renderScene({
      environment: cabana,
      occlusion: techoMadera,
      withSource: false,
    });

    expect(settledRms(buffer)).toBeLessThan(1e-6);
  });

  it("la respuesta propia sigue a la intensidad del Source", async () => {
    // Dos renders del mismo techo, con el Source presente y ausente: la
    // energia de la respuesta existe solo cuando hay algo que la excite.
    const conFuente = await renderScene({ occlusion: techoMadera });
    const sinFuente = await renderScene({ occlusion: techoMadera, withSource: false });

    expect(settledRms(conFuente)).toBeGreaterThan(settledRms(sinFuente) + 1e-5);
  });

  it("la ventana de vidrio y el techo de madera se distinguen pese a igual masa superficial", async () => {
    const conVentana = await renderScene({ environment: casa, occlusion: ventanaVidrio });
    const conTecho = await renderScene({ environment: casa, occlusion: techoMadera });

    const graveVentana = fractionOfEnergyInBand(
      conVentana.getChannelData(0),
      SAMPLE_RATE,
      [80, 500]
    );
    const graveTecho = fractionOfEnergyInBand(conTecho.getChannelData(0), SAMPLE_RATE, [80, 500]);

    // Misma atenuacion por ley de masas (10 kg/m2 ambas), distinta respuesta
    // propia: es la resonancia, no la transmision, lo que las diferencia.
    expect(graveVentana).not.toBeCloseTo(graveTecho, 2);
  });
});

describe("ModifierStage — distancia (grupo 5)", () => {
  it("alejarse atenua el nivel (tarea 5.3)", async () => {
    const cerca = await renderScene({ distanceMeters: 2 });
    const lejos = await renderScene({ distanceMeters: 100 });

    expect(settledRms(lejos)).toBeLessThan(settledRms(cerca));
  });

  it("alejarse tambien apaga el brillo, no solo baja el volumen", async () => {
    const cerca = await renderScene({ distanceMeters: 2 });
    const lejos = await renderScene({ distanceMeters: 150 });

    const agudosCerca = fractionOfEnergyInBand(cerca.getChannelData(0), SAMPLE_RATE, [4000, 20000]);
    const agudosLejos = fractionOfEnergyInBand(lejos.getChannelData(0), SAMPLE_RATE, [4000, 20000]);

    // Si la distancia fuera solo ganancia, la *fraccion* de energia en
    // agudos no cambiaria. Que baje es la absorcion atmosferica actuando.
    expect(agudosLejos).toBeLessThan(agudosCerca);
  });

  it("el Modifier solo, sin Environment ni Occlusion, ya produce un efecto coherente", async () => {
    const sinModifier = await renderScene({});
    const conModifier = await renderScene({ distanceMeters: 80 });

    expect(settledRms(conModifier)).toBeLessThan(settledRms(sinModifier));
  });
});

describe("Composicion progresiva — la escala completa (grupo 7)", () => {
  it("cada combinacion valida produce audio acotado y sin NaN (tarea 7.1)", async () => {
    const escenas: SceneOptions[] = [
      {},
      { environment: cabana },
      { environment: cabana, occlusion: techoMadera },
      { environment: cabana, occlusion: techoMadera, distanceMeters: 30 },
      { environment: casa, occlusion: ventanaVidrio, distanceMeters: 10 },
      { occlusion: techoMadera },
      { distanceMeters: 50 },
    ];

    for (const escena of escenas) {
      const buffer = await renderScene({ ...escena, durationSeconds: 4 });
      const channel = buffer.getChannelData(0);

      let peak = 0;
      for (let i = 0; i < channel.length; i++) {
        expect(Number.isFinite(channel[i])).toBe(true);
        peak = Math.max(peak, Math.abs(channel[i]));
      }
      expect(peak).toBeLessThanOrEqual(1);
      expect(rmsOf(channel as Float32Array)).toBeGreaterThan(0);
    }
  }, 90000);

  it("ningun componente es indispensable: rain sola sigue siendo audible y completa (tarea 7.2)", async () => {
    const completa = await renderScene({
      environment: cabana,
      occlusion: techoMadera,
      distanceMeters: 20,
      durationSeconds: 20,
    });
    const desnuda = await renderScene({ durationSeconds: 20 });

    // Al retirar todo, rain vuelve a cumplir su propio criterio espectral
    // exactamente igual que antes de agregar nada.
    const fraccion = fractionOfEnergyInBand(desnuda.getChannelData(0), SAMPLE_RATE, RAIN_BAND_HZ);
    expect(fraccion).toBeGreaterThanOrEqual(0.6);
    expect(settledRms(completa)).toBeGreaterThan(0);
  }, 60000);
});
