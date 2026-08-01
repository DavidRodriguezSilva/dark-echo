import type { AmbientDeclaration } from "../ambient";

const OLEAJE = "oleaje";

/**
 * `ocean`: cuerpo grave con envolvente de amplitud asimetrica (ascenso
 * rapido, caida larga) mas el estallido de la rompiente en la cresta
 * (design.md D3, synthesis-reference `oleaje`).
 *
 * La rompiente reutiliza la voz de gota (`impacto-gota`) con un decaimiento
 * mucho mas largo (0.3-1.2 s, ver doc) y baja probabilidad de componente
 * tonal: el estallido es sobre todo ruido de banda ancha, no una gota
 * individual. `rateHz` se deriva de `p_r / T_w` (probabilidad de rompiente
 * entre periodo de ola) en lugar de disparar en cada cresta exacta —
 * simplificacion documentada: no hay acoplamiento de fase entre la
 * envolvente de la ola y el disparo del estallido.
 */
export const ocean: AmbientDeclaration = {
  id: "ocean",
  label: "Océano",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: OLEAJE,
      noise: "brown",
      filter: { type: "lowpass", frequencyHz: 300 },
      modulation: {
        kind: "wave",
        min: 0.3,
        max: 1,
        periodSeconds: 7,
        riseFraction: 0.35,
        periodJitter: 0.25,
      },
      modulationTarget: "gain",
      gain: 0.6,
      stereo: { pan: 0, width: 0.7 },
    },
    rompiente: {
      kind: "sparse",
      model: OLEAJE,
      rateHz: 0.6 / 7,
      radiusRange: [0.01, 0.02],
      bubbleDecayRange: [0.3, 1.2],
      pitchDrift: 0.02,
      impactDurationRange: [0.3, 1.2],
      bubbleProbability: 0.2,
      renderDurationSeconds: 1.5,
      gain: 0.4,
    },
  },
};
