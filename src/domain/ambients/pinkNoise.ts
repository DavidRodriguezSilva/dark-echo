import type { AmbientDeclaration } from "../ambient";

/**
 * `pink-noise`: ruido de color puro (docs/synthesis-reference.md,
 * `ruido-de-color`), pendiente espectral ~1/f. Ver `whiteNoise.ts` para la
 * nota sobre el filtro transparente y la ausencia deliberada de modulacion.
 */
export const pinkNoise: AmbientDeclaration = {
  id: "pink-noise",
  label: "Ruido rosa",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: "ruido-de-color",
      noise: "pink",
      filter: { type: "lowpass", frequencyHz: 20000 },
      gain: 0.5,
      stereo: { pan: 0, width: 1 },
    },
  },
};
