import type { AmbientDeclaration } from "../ambient";

/**
 * `river`: flujo turbulento continuo mas el burbujeo de la corriente contra
 * piedras y orillas, con radios mayores que los de la lluvia (design.md D3,
 * synthesis-reference `flujo-turbulento`).
 */
export const river: AmbientDeclaration = {
  id: "river",
  label: "Río",
  layers: {
    flujo: {
      kind: "continuous",
      model: "flujo-turbulento",
      noise: "white",
      filter: { type: "bandpass", frequencyHz: 1200, q: 0.7 },
      modulation: {
        kind: "composite",
        min: 600,
        max: 2500,
        basePeriodSeconds: 20,
        randomWalkWeight: 0.8,
        randomWalkTimeConstantSeconds: 20,
      },
      gain: 0.5,
      stereo: { pan: 0, width: 0.5 },
    },
    burbujeo: {
      kind: "granular",
      model: "impacto-gota",
      // Densidad baja de burbujeo, radios mayores que la lluvia (registro
      // mas grave via Minnaert): textura de corriente, no goteo discernible.
      rateHz: 5,
      radiusRange: [0.002, 0.006],
      bubbleDecayRange: [0.006, 0.02],
      pitchDrift: 0.05,
      impactDurationRange: [0.002, 0.005],
      bubbleProbability: 0.8,
      gain: 0.3,
    },
  },
};
