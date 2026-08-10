/**
 * Nucleo puro del planificador de anticipacion (design.md D2): dado el
 * proximo instante de disparo, un horizonte hasta el que planificar y un
 * generador de intervalos, produce todos los disparos que caben antes del
 * horizonte y devuelve el proximo instante pendiente.
 *
 * Separado de cualquier reloj real para poder testearse con un horizonte
 * fabricado; `audio/lookaheadScheduler.ts` es el envoltorio que lo conecta
 * al reloj de `AudioContext.currentTime`.
 */
export function scheduleUpToHorizon(
  nextEventTime: number,
  horizonSeconds: number,
  nextInterval: () => number,
  onSchedule: (timeSeconds: number) => void
): number {
  let time = nextEventTime;

  while (time < horizonSeconds) {
    onSchedule(time);
    time += nextInterval();
  }

  return time;
}
