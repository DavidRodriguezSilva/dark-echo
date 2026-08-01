/**
 * Declaracion de una capa de ambiente: datos, no codigo (procedural-ambiences,
 * "El ambiente es una composicion declarativa de capas"). El tipo de
 * ambiente completo y el catalogo se definen en domain/ambient.ts y
 * domain/catalog.ts (tarea 8.1/8.2).
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
 * Rango de parametros de una voz de gota (synthesis-reference, modelo
 * `impacto-gota`), compartido por las capas de granulacion densa y de
 * eventos esporadicos.
 */
export interface DropVoiceRange {
  radiusRange: [number, number];
  bubbleDecayRange: [number, number];
  pitchDrift: number;
  impactDurationRange: [number, number];
  bubbleProbability?: number;
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

/**
 * Granulacion densa de eventos discretos (design.md D2): decenas o cientos
 * de voces por segundo, generadas dentro del worklet con su propio reloj de
 * muestras y su propio banco de voces.
 */
export interface GranularLayerDeclaration extends DropVoiceRange {
  kind: "granular";
  model: string;
  /** Densidad media de disparos, en eventos por segundo. */
  rateHz: number;
  gain: number;
}

/**
 * Eventos esporadicos (design.md D2): planificados con anticipacion desde
 * el hilo principal, cada uno renderizado como una voz de un solo uso.
 */
export interface SparseLayerDeclaration extends DropVoiceRange {
  kind: "sparse";
  model: string;
  /** Densidad media de disparos, en eventos por segundo (baja: eventos discernibles). */
  rateHz: number;
  /** Duracion a renderizar por voz, en segundos. */
  renderDurationSeconds: number;
  gain: number;
}

export type LayerDeclaration =
  ContinuousLayerDeclaration | GranularLayerDeclaration | SparseLayerDeclaration;
