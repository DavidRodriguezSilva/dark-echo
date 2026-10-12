/**
 * Temporizador de apagado (capacidad `sleep-timer`): lectura de lo que el
 * usuario escribe, sin reloj ni efectos. Puro y determinista — el reloj entra
 * por parámetro (design.md D1 de `add-sleep-timer`).
 */

export const MIN_TIMER_SECONDS = 1;
export const MAX_TIMER_SECONDS = 12 * 60 * 60;

/** Duración del desvanecimiento de apagado; termina en la hora elegida (D2). */
export const SLEEP_FADE_SECONDS = 20;

export const TIMER_FORMAT_HELP =
  'Duración: "30m", "1h", "1h30m" o "0:27:00" (de 1 s a 12 h). Hora: "at 23:30" (24 h).';

export type TimerParse = { ok: true; seconds: number } | { ok: false; message: string };
export type TimerEndParse = { ok: true; endAt: number } | { ok: false; message: string };

const DURATION_UNITS = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
const CLOCK_DURATION = /^(\d+):([0-5]?\d):([0-5]?\d)$/;
const CLOCK_TIME = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function inRange(seconds: number): TimerParse {
  if (seconds < MIN_TIMER_SECONDS || seconds > MAX_TIMER_SECONDS) {
    return { ok: false, message: `La duración debe estar entre 1 s y 12 h. ${TIMER_FORMAT_HELP}` };
  }
  return { ok: true, seconds };
}

/** Lee una duración: `30m`, `1h30m`, `45s` o `H:MM:SS`. */
export function parseDuration(text: string): TimerParse {
  const value = text.trim().toLowerCase();

  const clock = CLOCK_DURATION.exec(value);
  if (clock) return inRange(Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]));

  const units = DURATION_UNITS.exec(value);
  if (units && value !== "") {
    return inRange(
      Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0)
    );
  }

  return { ok: false, message: `No entiendo "${text}". ${TIMER_FORMAT_HELP}` };
}

/**
 * Lee una hora `HH:MM` y devuelve su próxima ocurrencia como marca de reloj
 * (ms). Si la hora ya pasó hoy, es mañana (D6).
 */
export function parseClockTime(text: string, now: number): TimerEndParse {
  const match = CLOCK_TIME.exec(text.trim());
  if (!match) return { ok: false, message: `No entiendo la hora "${text}". ${TIMER_FORMAT_HELP}` };

  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  if (target.getTime() <= now) target.setDate(target.getDate() + 1);

  return { ok: true, endAt: target.getTime() };
}

/** `1h 05m 09s`, sin ceros a la izquierda en la unidad mayor. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
