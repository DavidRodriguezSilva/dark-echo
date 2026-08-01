import type { AmbientDeclaration } from "../ambient";

// synthesis-reference.md, "impacto-gota": el cuerpo continuo es el limite
// agregado del mismo fenomeno a densidad muy alta -- muchos impactos
// solapados se funden en una textura continua -- por eso las tres capas
// trazan al mismo modelo en lugar de inventar uno nuevo para la textura.
const IMPACTO_GOTA = "impacto-gota";

/**
 * `rain`: rebanada vertical de referencia del modelo declarativo
 * (procedural-ambiences, "Composicion multicapa de la lluvia"). Tres capas
 * direccionables por separado: cuerpo continuo, granulacion densa de
 * impactos cercanos, y goteo esporadico de gotas individuales audibles.
 */
export const rain: AmbientDeclaration = {
  id: "rain",
  label: "Lluvia",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: IMPACTO_GOTA,
      noise: "white",
      filter: { type: "lowpass", frequencyHz: 2000 },
      // Banda dentro de la declarada en el criterio espectral de rain
      // (800 Hz - 6 kHz); el periodo largo son los "frentes de intensidad".
      // Peso del paseo aleatorio alto (tarea 9.4, calibrado sobre el render
      // real): con el peso por defecto la componente periodica dominaba la
      // autocorrelacion de la envolvente incluso en renders largos.
      modulation: {
        kind: "composite",
        min: 800,
        max: 3000,
        basePeriodSeconds: 17,
        randomWalkWeight: 0.8,
        randomWalkTimeConstantSeconds: 17,
      },
      gain: 0.5,
      stereo: { pan: 0, width: 0.6 },
    },
    impactos: {
      kind: "granular",
      model: IMPACTO_GOTA,
      // Densidad de "lluvia cercana sobre superficie" (design.md D3); no hay
      // un unico valor fisico correcto, es una decision de composicion.
      rateHz: 40,
      radiusRange: [0.0004, 0.0018],
      bubbleDecayRange: [0.004, 0.014],
      pitchDrift: 0.05,
      impactDurationRange: [0.001, 0.003],
      bubbleProbability: 0.7,
      gain: 0.35,
    },
    goteo: {
      kind: "sparse",
      model: IMPACTO_GOTA,
      // Gotas individuales, discernibles una a una.
      rateHz: 2.5,
      radiusRange: [0.0012, 0.0025],
      bubbleDecayRange: [0.01, 0.02],
      pitchDrift: 0.06,
      impactDurationRange: [0.002, 0.004],
      bubbleProbability: 0.85,
      renderDurationSeconds: 0.05,
      gain: 0.5,
    },
  },
};
