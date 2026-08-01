import type { AmbientDeclaration } from "../ambient";

/**
 * `wind`: ruido marron pasa-bajos cuya frecuencia de corte sigue el
 * modulador compuesto dominado por paseo aleatorio (design.md D3), en lugar
 * del LFO sinusoidal del prototipo anterior.
 *
 * Simplificacion documentada: se omite el pasa-banda resonante opcional del
 * silbido (synthesis-reference, `rafaga-aire`) — es explicitamente opcional
 * en el modelo, y anadirlo exige una modulacion condicionada por umbral que
 * el compilador de capas actual no expone todavia.
 */
export const wind: AmbientDeclaration = {
  id: "wind",
  label: "Viento",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: "rafaga-aire",
      noise: "brown",
      filter: { type: "lowpass", frequencyHz: 800 },
      modulation: {
        kind: "composite",
        min: 200,
        max: 2000,
        basePeriodSeconds: 40,
        randomWalkWeight: 0.85,
        randomWalkTimeConstantSeconds: 40,
      },
      gain: 0.6,
      stereo: { pan: 0, width: 0.8 },
    },
  },
};
