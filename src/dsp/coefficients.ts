/**
 * Derivacion de coeficientes a partir de parametros fisicos y de la
 * frecuencia de muestreo real (design.md D15, synthesis-reference:
 * "Parametros expresados en unidades fisicas"). Ningun modelo declara un
 * coeficiente directamente: declara una magnitud fisica -- aqui, una
 * frecuencia de corte en Hz -- y el coeficiente se deriva en tiempo de
 * ejecucion, de modo que el comportamiento no dependa de la frecuencia de
 * muestreo del dispositivo.
 */

/**
 * Coeficiente de un filtro pasa-bajos de un polo (y[n] = (1-a)x[n] + a y[n-1])
 * cuya frecuencia de corte de -3 dB es `cutoffHz`, independientemente de la
 * frecuencia de muestreo.
 */
export function onePoleLowpassCoefficient(cutoffHz: number, sampleRate: number): number {
  return Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
}

/**
 * Magnitud de la respuesta en frecuencia de ese mismo filtro, evaluada en
 * `frequencyHz`. Sirve para verificar que el coeficiente derivado produce el
 * corte de -3 dB esperado en `cutoffHz`, para cualquier frecuencia de
 * muestreo.
 */
export function onePoleLowpassResponseAt(
  frequencyHz: number,
  cutoffHz: number,
  sampleRate: number
): number {
  const a = onePoleLowpassCoefficient(cutoffHz, sampleRate);
  const omega = (2 * Math.PI * frequencyHz) / sampleRate;

  // H(e^{jw}) = (1 - a) / (1 - a e^{-jw})
  const real = 1 - a * Math.cos(omega);
  const imag = a * Math.sin(omega);
  const denominatorMagnitude = Math.sqrt(real * real + imag * imag);

  return (1 - a) / denominatorMagnitude;
}

/** Coeficientes de un biquad en forma directa I, ya normalizados por `a0`. */
export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Pasa-banda de dos polos (formulario RBJ, ganancia de pico 0 dB) derivado de
 * su frecuencia central en Hz, su `Q` y la frecuencia de muestreo real -- no
 * de coeficientes fijos, igual que el resto de este modulo.
 *
 * Lo usa la voz de gota para el transitorio de impacto, que
 * `docs/synthesis-reference.md` (`impacto-gota`) declara como "un pulso de
 * ruido pasado por un filtro pasa-banda de Q moderado" con su centro de banda
 * `f_i` entre 1500 y 6000 Hz.
 */
export function biquadBandpassCoefficients(
  centerHz: number,
  q: number,
  sampleRate: number
): BiquadCoefficients {
  const w0 = (2 * Math.PI * centerHz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);
  const a0 = 1 + alpha;

  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

/** Estado de un biquad de segundo orden, un canal. */
export interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function createBiquadState(): BiquadState {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

/** Procesa una muestra por el biquad, actualizando su estado en sitio. */
export function processBiquad(
  state: BiquadState,
  { b0, b1, b2, a1, a2 }: BiquadCoefficients,
  input: number
): number {
  const output = b0 * input + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2;
  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = output;
  return output;
}
