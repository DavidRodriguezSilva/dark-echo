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
    // Cuerpo grave (refinamiento del catalogo, `flujo-turbulento`): sin
    // ninguna capa por debajo de 150 Hz, el rio no tenia sensacion de masa
    // de agua y el bandpass de `flujo` por si solo se percibia como aire en
    // movimiento (viento), no como corriente. Ruido marron sin modulacion:
    // aporta cuerpo constante, la variacion la sigue llevando `flujo`.
    cuerpo: {
      kind: "continuous",
      model: "flujo-turbulento",
      noise: "brown",
      filter: { type: "lowpass", frequencyHz: 180 },
      gain: 0.22,
      stereo: { pan: 0, width: 0.4 },
    },
    flujo: {
      kind: "continuous",
      model: "flujo-turbulento",
      noise: "white",
      filter: { type: "bandpass", frequencyHz: 1200, q: 0.7 },
      modulation: {
        kind: "composite",
        min: 600,
        max: 2500,
        // Periodo mas corto (20 -> 10 s, dentro del rango declarado de T_v,
        // 8-40 s) para una variacion de caudal mas propia de turbulencia de
        // rio que de un oleaje oceanico lento.
        basePeriodSeconds: 10,
        randomWalkWeight: 0.8,
        randomWalkTimeConstantSeconds: 10,
      },
      gain: 0.5,
      stereo: { pan: 0, width: 0.5 },
    },
    burbujeo: {
      kind: "granular",
      model: "impacto-gota",
      // Densidad y ganancia subidas al tope del rango declarado (lambda_b:
      // 2-8 eventos/s) para una textura mas granulada de "agua sobre
      // piedras" -- a 5/s se percibia demasiado dispersa para leerse como
      // burbujeo continuo.
      rateHz: 8,
      radiusRange: [0.002, 0.006],
      bubbleDecayRange: [0.006, 0.02],
      pitchDrift: 0.05,
      impactDurationRange: [0.002, 0.005],
      bubbleProbability: 0.8,
      gain: 0.4,
    },
  },
};
