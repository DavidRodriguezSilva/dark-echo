import type { AmbientDeclaration } from "../ambient";

/**
 * `brown-noise`: ruido de color puro (docs/synthesis-reference.md,
 * `ruido-de-color`), pendiente espectral ~1/f^2. Ver `whiteNoise.ts` para la
 * nota sobre el filtro transparente y la ausencia deliberada de modulacion.
 */
export const brownNoise: AmbientDeclaration = {
  id: "brown-noise",
  label: "Ruido marrón",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: "ruido-de-color",
      noise: "brown",
      filter: { type: "lowpass", frequencyHz: 20000 },
      gain: 0.5,
      stereo: { pan: 0, width: 1 },
    },
  },
};
