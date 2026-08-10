/**
 * Transiciones sin artefactos (audio-engine): toda entrada o salida cambia
 * de forma gradual, y una orden que llega a mitad de una rampa parte de la
 * amplitud instantanea vigente, no de un valor fijo.
 */
export function rampToValue(
  param: AudioParam,
  context: BaseAudioContext,
  target: number,
  durationSeconds: number
): void {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + durationSeconds);
}
