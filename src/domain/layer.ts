/**
 * Declaracion de una capa de ambiente: datos, no codigo (procedural-ambiences,
 * "El ambiente es una composicion declarativa de capas"). El tipo de
 * ambiente completo y el catalogo se definen en domain/ambient.ts y
 * domain/catalog.ts (tarea 8.1/8.2).
 */

export type NoiseColor = "white" | "pink" | "brown";

/** Colocacion y anchura en el campo estereo (synthesis-reference, "Criterios de imagen estereo"). */
export interface StereoImage {
  /** Posicion, de -1 (izquierda) a 1 (derecha). */
  pan: number;
  /** Anchura de la decorrelacion entre canales, de 0 (puntual) a 1 (todo el campo). */
  width: number;
}

/** Modulacion continua de un parametro segun el modulador compuesto (design.md D5). */
export interface CompositeModulation {
  kind: "composite";
  min: number;
  max: number;
  basePeriodSeconds: number;
  /** Peso del paseo aleatorio frente a la suma de senoides, en [0, 1]. */
  randomWalkWeight?: number;
  /** Constante de tiempo del paseo aleatorio, en segundos. */
  randomWalkTimeConstantSeconds?: number;
}

/**
 * Modulacion por envolvente asimetrica (synthesis-reference, `oleaje`):
 * ascenso mas rapido que la caida, a diferencia de la composite (simetrica
 * en distribucion aunque no en trayectoria puntual).
 */
export interface WaveModulation {
  kind: "wave";
  min: number;
  max: number;
  periodSeconds: number;
  riseFraction: number;
  periodJitter?: number;
}

export type ContinuousModulation = CompositeModulation | WaveModulation;

/** A que parametro nativo se conecta la salida del modulador. */
export type ModulationTarget = "filterFrequency" | "gain";

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
  /** Peso de la burbuja frente al impacto en la mezcla final, en [0, 1]. Por defecto 0.5 (dsp/dropVoice.ts). */
  bubbleMix?: number;
  /**
   * Centro de banda del transitorio de impacto, en Hz (synthesis-reference,
   * `impacto-gota`, parametro `f_i`; rango declarado 1500 - 6000). Sin
   * declarar, el impacto sale como ruido de espectro completo.
   */
  impactBandHz?: number;
  /** `Q` del pasa-banda del impacto; por defecto 1 (dsp/dropVoice.ts). */
  impactQ?: number;
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
  /** A que se conecta `modulation`. Por defecto, la frecuencia de corte del filtro. */
  modulationTarget?: ModulationTarget;
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
  /**
   * Filtro opcional aplicado a cada voz completa (impacto + burbuja), antes
   * de mezclarse con el resto del ambiente. Sin el, la voz suena a espectro
   * completo (adecuado para gotas discretas); util cuando el evento debe
   * quedar anclado a una banda concreta del ambiente en vez de sonar como
   * ruido generico (p. ej. `ocean.rompiente`, modelo `oleaje`).
   */
  filter?: {
    type: "lowpass" | "highpass" | "bandpass";
    frequencyHz: number;
    q?: number;
  };
}

export type LayerDeclaration =
  ContinuousLayerDeclaration | GranularLayerDeclaration | SparseLayerDeclaration;
