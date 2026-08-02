import { describe, expect, it } from "vitest";
import {
  airAbsorptionCutoffHz,
  distanceGain,
  massLawCutoffHz,
  massLawTransmissionLossDb,
  plateModes,
  sabineReverbTimePerBand,
  sabineReverbTimeSeconds,
  surfaceMassKgPerSquareMeter,
} from "./acoustics";

/**
 * Verifica que cada funcion reproduce el resultado que su ley fisica predice,
 * no solo que devuelve "algun numero": los valores esperados se calculan a
 * mano a partir de la formula declarada en docs/synthesis-reference.md.
 */

describe("sabineReverbTimeSeconds", () => {
  it("reproduce el RT60 que predice la formula de Sabine", () => {
    // Cabana: V = 60 m3, S = 94 m2, alpha = 0.2 -> A = 18.8 m2 sabin
    // RT60 = 0.161 * 60 / 18.8 = 0.5138 s
    expect(sabineReverbTimeSeconds(60, 94, 0.2)).toBeCloseTo(0.5138, 3);
  });

  it("un recinto menos absorbente reverbera mas tiempo", () => {
    const absorbente = sabineReverbTimeSeconds(80, 120, 0.25);
    const reflectante = sabineReverbTimeSeconds(80, 120, 0.1);
    expect(reflectante).toBeGreaterThan(absorbente);
  });

  it("un espacio sin volumen encerrado no tiene cola reverberante", () => {
    expect(sabineReverbTimeSeconds(0, 0, 0)).toBe(0);
  });

  it("el concreto reverbera notablemente mas que la madera pese al volumen similar", () => {
    const cabana = sabineReverbTimePerBand(60, 94, { low: 0.25, mid: 0.2, high: 0.22 });
    const casa = sabineReverbTimePerBand(81, 119.4, { low: 0.14, mid: 0.1, high: 0.12 });

    expect(casa.mid).toBeGreaterThan(cabana.mid * 1.8);
  });

  it("la madera absorbe mas en graves, asi que su banda baja decae antes que la media", () => {
    const cabana = sabineReverbTimePerBand(60, 94, { low: 0.25, mid: 0.2, high: 0.22 });
    expect(cabana.low).toBeLessThan(cabana.mid);
  });
});

describe("massLawTransmissionLossDb", () => {
  it("reproduce la ley de masas de incidencia de campo", () => {
    // TL = 20*log10(10 * 1000) - 47 = 80 - 47 = 33 dB
    expect(massLawTransmissionLossDb(10, 1000)).toBeCloseTo(33, 6);
  });

  it("atenua 6 dB mas por cada duplicacion de la frecuencia", () => {
    const a = massLawTransmissionLossDb(10, 500);
    const b = massLawTransmissionLossDb(10, 1000);
    expect(b - a).toBeCloseTo(6.0206, 3);
  });

  it("atenua 6 dB mas por cada duplicacion de la masa superficial", () => {
    const delgada = massLawTransmissionLossDb(10, 1000);
    const gruesa = massLawTransmissionLossDb(20, 1000);
    expect(gruesa - delgada).toBeCloseTo(6.0206, 3);
  });
});

describe("massLawCutoffHz", () => {
  it("el corte equivalente es 10^(47/20) / masa superficial", () => {
    expect(massLawCutoffHz(10)).toBeCloseTo(22.387, 3);
  });

  it("el pasa-bajos equivalente reproduce la atenuacion de la ley de masas", () => {
    // Por encima del corte, un polo cae como fc/f: comprobamos que la
    // ganancia asintotica coincide con 10^(-TL/20) de la ley de masas.
    const mass = 10;
    const frequency = 1000;
    const onePoleGain = massLawCutoffHz(mass) / frequency;
    const massLawGain = Math.pow(10, -massLawTransmissionLossDb(mass, frequency) / 20);
    expect(onePoleGain).toBeCloseTo(massLawGain, 6);
  });

  it("una barrera del doble de masa corta una octava mas abajo", () => {
    expect(massLawCutoffHz(10) / massLawCutoffHz(20)).toBeCloseTo(2, 6);
  });
});

describe("surfaceMassKgPerSquareMeter", () => {
  it("una tabla de pino de 20 mm y un vidrio de 4 mm tienen la misma masa superficial", () => {
    const pino = surfaceMassKgPerSquareMeter(500, 0.02);
    const vidrio = surfaceMassKgPerSquareMeter(2500, 0.004);
    expect(pino).toBeCloseTo(10, 6);
    expect(vidrio).toBeCloseTo(10, 6);
    // Consecuencia: aislan lo mismo. El material por si solo no determina el
    // aislamiento -- lo hace la masa por unidad de superficie.
    expect(massLawCutoffHz(pino)).toBeCloseTo(massLawCutoffHz(vidrio), 6);
  });
});

describe("plateModes", () => {
  const pino = {
    youngsModulusPa: 8e9,
    densityKgPerCubicMeter: 500,
    poissonRatio: 0.3,
    lossFactor: 0.02,
  };
  const vidrio = {
    youngsModulusPa: 70e9,
    densityKgPerCubicMeter: 2500,
    poissonRatio: 0.22,
    lossFactor: 0.002,
  };

  it("devuelve modos ordenados por frecuencia, dentro del rango audible", () => {
    const modes = plateModes({ spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 }, pino, 6);

    expect(modes).toHaveLength(6);
    for (let i = 1; i < modes.length; i++) {
      expect(modes[i].frequencyHz).toBeGreaterThanOrEqual(modes[i - 1].frequencyHz);
    }
    for (const mode of modes) {
      expect(mode.frequencyHz).toBeGreaterThanOrEqual(40);
      expect(mode.frequencyHz).toBeLessThanOrEqual(8000);
    }
  });

  it("el pano de techo de madera resuena en la banda grave-media", () => {
    const modes = plateModes({ spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 }, pino, 6);
    // El modo fundamental (1,1) de un pano de 3 x 0.6 m en tabla de 20 mm
    // cae poco por encima de 100 Hz: el "tamborileo" grave de la lluvia
    // sobre una cubierta de madera.
    expect(modes[0].frequencyHz).toBeGreaterThan(80);
    expect(modes[0].frequencyHz).toBeLessThan(200);
  });

  it("el vidrio se sostiene mucho mas que la madera: Q diez veces mayor", () => {
    const madera = plateModes({ spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 }, pino, 4);
    const cristal = plateModes(
      { spanXMeters: 1.2, spanYMeters: 0.8, thicknessMeters: 0.004 },
      vidrio,
      4
    );

    // Q = 1/eta, acotado por implementacion a [10, 120]: madera 1/0.02 = 50,
    // vidrio 1/0.002 = 500 -> recortado a 120.
    expect(madera[0].q).toBeCloseTo(50, 6);
    expect(cristal[0].q).toBeCloseTo(120, 6);
    expect(cristal[0].q).toBeGreaterThan(madera[0].q * 2);
  });

  it("una placa mas gruesa del mismo material sube sus frecuencias modales", () => {
    const delgada = plateModes(
      { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 },
      pino,
      1
    );
    const gruesa = plateModes({ spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.04 }, pino, 1);
    expect(gruesa[0].frequencyHz).toBeCloseTo(delgada[0].frequencyHz * 2, 3);
  });
});

describe("distanceGain", () => {
  it("cae 6 dB por cada duplicacion de la distancia", () => {
    const cerca = distanceGain(10, 1);
    const lejos = distanceGain(20, 1);
    const dropDb = 20 * Math.log10(lejos / cerca);
    expect(dropDb).toBeCloseTo(-6.0206, 3);
  });

  it("no amplifica por debajo de la distancia de referencia", () => {
    expect(distanceGain(0.5, 1)).toBe(1);
  });
});

describe("airAbsorptionCutoffHz", () => {
  it("cuanto mas lejos, mas bajo es el corte: la distancia se lleva los agudos", () => {
    expect(airAbsorptionCutoffHz(100)).toBeLessThan(airAbsorptionCutoffHz(10));
  });

  it("el corte cae con la raiz de la distancia", () => {
    // f = 1000 * sqrt(budget / (0.0025 * d)) -> cuadruplicar d divide f por 2
    expect(airAbsorptionCutoffHz(10) / airAbsorptionCutoffHz(40)).toBeCloseTo(2, 6);
  });
});
