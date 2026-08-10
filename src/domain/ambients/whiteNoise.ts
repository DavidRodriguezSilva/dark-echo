import type { AmbientDeclaration } from "../ambient";

/**
 * `white-noise`: ruido de color puro (docs/synthesis-reference.md,
 * `ruido-de-color`), sin filtro que recorte banda ni modulacion — a
 * diferencia del resto del catalogo, aqui la ausencia de variacion de
 * caracter es el fenomeno mismo, no una simplificacion. El filtro pasa-bajos
 * a 20 kHz es efectivamente transparente (por encima del rango util de
 * cualquier frecuencia de muestreo soportada); existe solo porque el tipo de
 * capa continua lo exige, no para dar forma a la senal.
 */
export const whiteNoise: AmbientDeclaration = {
  id: "white-noise",
  label: "Ruido blanco",
  layers: {
    cuerpo: {
      kind: "continuous",
      model: "ruido-de-color",
      noise: "white",
      filter: { type: "lowpass", frequencyHz: 20000 },
      gain: 0.5,
      stereo: { pan: 0, width: 1 },
    },
  },
};
