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
