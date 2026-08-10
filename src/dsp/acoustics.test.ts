import { describe, expect, it } from "vitest";
import {
  plateBendingFactor,
  FLANKING_FLOOR_DB,
  MASS_LAW_VALIDITY_FLOOR_HZ,
  massLawResponse,
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
    lossFactor: 0.08,
  };
  const vidrio = {
    youngsModulusPa: 70e9,
    densityKgPerCubicMeter: 2500,
    poissonRatio: 0.22,
    lossFactor: 0.03,
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

  it("el vidrio se sostiene mas que la madera, con el factor de perdida instalado", () => {
    const madera = plateModes({ spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 }, pino, 4);
    const cristal = plateModes(
      { spanXMeters: 1.2, spanYMeters: 0.8, thicknessMeters: 0.004 },
      vidrio,
      4
    );

    // Q = 1/eta sobre el factor de perdida TOTAL de la placa instalada, no el
    // del material: madera montada 1/0.08 = 12.5, vidrio enmarcado 1/0.03 =
    // 33.3 -> acotado por implementacion a [4, 20].
    expect(madera[0].q).toBeCloseTo(12.5, 6);
    expect(cristal[0].q).toBeCloseTo(20, 6);
    // Sigue sosteniendose mas que la madera, que es la diferencia audible.
    expect(cristal[0].q).toBeGreaterThan(madera[0].q);
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

describe("massLawResponse — ley de masas acotada a su region de validez", () => {
  it("nunca amplifica, por ligera que sea la barrera", () => {
    for (const mass of [0.5, 1, 5, 10, 20, 200]) {
      const response = massLawResponse(mass);
      expect(response.gain).toBeLessThanOrEqual(1);
      expect(response.flankingGain).toBeLessThanOrEqual(1);
    }
  });

  it("reproduce la ley de masas exactamente en el suelo de validez", () => {
    const mass = 10;
    const response = massLawResponse(mass);
    const expected = Math.pow(
      10,
      -massLawTransmissionLossDb(mass, MASS_LAW_VALIDITY_FLOOR_HZ) / 20
    );
    expect(response.gain).toBeCloseTo(expected, 10);
  });

  it("una barrera del doble de masa transmite 6 dB menos", () => {
    const delgada = massLawResponse(10);
    const gruesa = massLawResponse(20);
    const differenceDb = 20 * Math.log10(gruesa.gain / delgada.gain);
    expect(differenceDb).toBeCloseTo(-6.0206, 3);
  });

  it("el camino indirecto pone un suelo al aislamiento, plano en frecuencia", () => {
    // Por muy pesada que sea la barrera, el flanking no baja del suelo
    // declarado: es lo que impide que la escena tienda al silencio en agudos.
    const muroPesado = massLawResponse(500);
    expect(20 * Math.log10(muroPesado.flankingGain)).toBeCloseTo(FLANKING_FLOOR_DB, 6);
  });

  it("el flanking es un suelo, no un tope: domina justo cuando la barrera aisla bien", () => {
    // Un muro pesado transmite por si mismo mucho menos que el suelo de
    // flanking, asi que es el flanking el que fija el aislamiento efectivo.
    // Implementarlo como `min` (un tope) lo habria desactivado precisamente
    // en el caso donde el fenomeno importa.
    const muroPesado = massLawResponse(500);
    expect(muroPesado.flankingGain).toBeGreaterThan(muroPesado.gain);

    // En una barrera ligera pasa lo contrario y el directo manda.
    const laminaLigera = massLawResponse(2);
    expect(laminaLigera.gain).toBeGreaterThan(laminaLigera.flankingGain);
  });
});

describe("plateModes — reparto por la banda declarada", () => {
  const pino = {
    youngsModulusPa: 8e9,
    densityKgPerCubicMeter: 500,
    poissonRatio: 0.3,
    lossFactor: 0.08,
  };

  it("los modos se reparten por la banda, no se amontonan en el arranque de la serie", () => {
    const geometry = { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 };
    const modes = plateModes(geometry, pino, 4, [40, 600]);

    expect(modes.length).toBeGreaterThan(1);
    // El defecto original: los N modos mas graves de este pano caben en menos
    // de una octava y, excitados sin pausa, zumban como uno solo. Repartidos,
    // el banco cubre mas de una octava de la banda declarada.
    const octavas = Math.log2(modes[modes.length - 1].frequencyHz / modes[0].frequencyHz);
    expect(octavas).toBeGreaterThan(1);
  });

  it("respeta la banda declarada", () => {
    const geometry = { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 };
    const modes = plateModes(geometry, pino, 4, [40, 600]);

    for (const mode of modes) {
      expect(mode.frequencyHz).toBeGreaterThanOrEqual(40);
      expect(mode.frequencyHz).toBeLessThanOrEqual(600);
    }
  });

  it("no inventa frecuencias: cada modo devuelto es un modo real de la placa", () => {
    const geometry = { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 };
    const modes = plateModes(geometry, pino, 4, [40, 600]);
    const bending = plateBendingFactor(
      pino.youngsModulusPa,
      pino.densityKgPerCubicMeter,
      pino.poissonRatio,
      geometry.thicknessMeters
    );

    for (const mode of modes) {
      let found = false;
      for (let m = 1; m <= 40 && !found; m++) {
        for (let n = 1; n <= 40 && !found; n++) {
          const f =
            (Math.PI / 2) *
            bending *
            ((m / geometry.spanXMeters) ** 2 + (n / geometry.spanYMeters) ** 2);
          if (Math.abs(f - mode.frequencyHz) < 1e-6) found = true;
        }
      }
      expect(found, `${mode.frequencyHz} Hz no es un modo real de la placa`).toBe(true);
    }
  });
});
