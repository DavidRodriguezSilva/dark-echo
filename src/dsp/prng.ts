/**
 * PRNG sembrado (mulberry32). Todo consumo de aleatoriedad en dsp/ pasa por
 * aqui: sin semilla no hay determinismo, y sin determinismo los criterios de
 * `synthesis-reference` (perfil espectral, no periodicidad) no son
 * verificables (design.md D4). `Math.random()` no se usa en el nucleo de DSP.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Semilla no determinista para uso normal: cada sesion de reproduccion parte
 * de un estado distinto (procedural-ambiences, "Sesiones sucesivas sin
 * semilla explicita"). Usa Web Crypto en lugar de `Math.random()` para que
 * ninguna llamada a `Math.random()` exista en dsp/, ni siquiera aqui.
 */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/**
 * Deriva la semilla de una capa a partir de una base de sesion y su id
 * (p. ej. "rain.cuerpo"). Distinta base -> distinta semilla para el mismo id
 * (sesiones sucesivas no repiten desarrollo temporal); distinto id con la
 * misma base -> tambien distinta semilla (dos capas del mismo ambiente no
 * comparten secuencia). Extraida como funcion pura para poder testearla sin
 * un `AudioContext` real (usada por `audio/composition/compositionEngine.ts`).
 */
export function deriveLayerSeed(sessionSeed: number, id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (sessionSeed ^ hash) >>> 0 || 1;
}
