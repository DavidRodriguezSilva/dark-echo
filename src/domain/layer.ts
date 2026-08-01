/**
 * Declaracion de una capa de ambiente: datos, no codigo (procedural-ambiences,
 * "El ambiente es una composicion declarativa de capas"). El tipo de
 * ambiente completo y el catalogo se definen en la tarea 8.1; este archivo
 * cubre lo que necesita el compilador de capas de `audio/` (tarea 7.5).
 */

export type NoiseColor = "white" | "brown";

/** Colocacion y anchura en el campo estereo (synthesis-reference, "Criterios de imagen estereo"). */
export interface StereoImage {
  /** Posicion, de -1 (izquierda) a 1 (derecha). */
  pan: number;
  /** Anchura de la decorrelacion entre canales, de 0 (puntual) a 1 (todo el campo). */
  width: number;
}

/** Modulacion continua de un parametro segun el modulador compuesto (design.md D5). */
export interface ContinuousModulation {
  minHz: number;
  maxHz: number;
  basePeriodSeconds: number;
}

/**
 * Una capa continua: ruido de color declarado, filtrado, con modulacion
 * opcional de la frecuencia de corte y su propia imagen estereo.
 */
export interface ContinuousLayerDeclaration {
  kind: "continuous";
  /** Identificador del modelo en docs/synthesis-reference.md. */
  model: string;
  noise: NoiseColor;
  filter: {
    type: "lowpass" | "highpass" | "bandpass";
    frequencyHz: number;
    q?: number;
  };
  modulation?: ContinuousModulation;
  gain: number;
  stereo: StereoImage;
}

export type LayerDeclaration = ContinuousLayerDeclaration;
