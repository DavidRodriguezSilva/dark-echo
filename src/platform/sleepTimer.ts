import {
  formatRemaining,
  parseClockTime,
  parseDuration,
  SLEEP_FADE_SECONDS,
} from "../domain/sleepTimer";

/**
 * Store observable del temporizador de apagado (capacidad `sleep-timer`).
 * Mismo patrón que `AppearanceStore`: `subscribe`/`getSnapshot` para
 * `useSyncExternalStore`, mutado imperativamente por comandos y controles.
 *
 * Reloj, programador y efectos entran por parámetro, así que los tests corren
 * en Node con un reloj falso. **No persiste** (design.md D3): recargar lo
 * cancela. La hora se compara contra una marca absoluta, no contando ticks
 * (D4), y `check()` es público para que la UI lo llame al volver la pestaña a
 * primer plano.
 */

export interface SleepTimerState {
  /** Marca de reloj (ms) en la que se fijó; con `endAt` da la duración total. */
  startedAt: number;
  /** Marca de reloj (ms) en la que el sonido ya está en silencio. */
  endAt: number;
  /** El desvanecimiento ya empezó. */
  fading: boolean;
}

export interface SleepTimerDeps {
  now: () => number;
  /** Devuelve una función que cancela el intervalo. */
  every: (callback: () => void, ms: number) => () => void;
  isPlaying: () => boolean;
  /** Desvanece y detiene la mezcla en `fadeSeconds`. */
  fadeOut: (fadeSeconds: number) => void;
}

type Listener = () => void;

export class SleepTimerStore {
  private state: SleepTimerState | null = null;
  private stopTicking: (() => void) | null = null;
  private readonly listeners = new Set<Listener>();

  private readonly deps: SleepTimerDeps;

  constructor(deps: SleepTimerDeps) {
    this.deps = deps;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SleepTimerState | null => this.state;

  /** Fija el temporizador, sustituyendo al anterior. Exige que algo suene. */
  set(endAt: number): { ok: boolean; message: string } {
    if (!this.deps.isPlaying()) {
      return {
        ok: false,
        message: "No hay nada sonando: el temporizador se fija con algo en marcha.",
      };
    }
    this.clear(false);
    this.state = { startedAt: this.deps.now(), endAt, fading: false };
    this.stopTicking = this.deps.every(() => this.check(), 1000);
    this.check();
    this.emit();
    return { ok: true, message: "" };
  }

  /** Cancela a mano. Devuelve si había algo que cancelar. */
  cancel(): boolean {
    if (!this.state) return false;
    this.clear(true);
    return true;
  }

  /** Revisa contra el reloj; lo invocan el intervalo y `visibilitychange`. */
  check(): void {
    const state = this.state;
    if (!state) return;

    if (!state.fading && !this.deps.isPlaying()) {
      // El usuario detuvo o vació la escena: se cancela y no se rearma (D5).
      this.clear(true);
      return;
    }

    const remainingMs = state.endAt - this.deps.now();
    if (remainingMs <= 0) {
      this.clear(true);
      return;
    }

    if (!state.fading && remainingMs <= SLEEP_FADE_SECONDS * 1000) {
      this.state = { ...state, fading: true };
      this.deps.fadeOut(remainingMs / 1000);
      this.emit();
    }
  }

  private clear(notify: boolean): void {
    this.stopTicking?.();
    this.stopTicking = null;
    this.state = null;
    if (notify) this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Hora de pared `HH:MM` para decirle al usuario cuándo se apaga. */
function clockLabel(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Adaptador que el comando `timer` consume (`SleepTimerController` en
 * `commands/`), para que `commands/` no dependa de `platform/`.
 */
export function createSleepTimerController(store: SleepTimerStore, now: () => number) {
  function apply(endAt: number) {
    const result = store.set(endAt);
    if (!result.ok) return result;
    return {
      ok: true,
      message: `Apagado a las ${clockLabel(endAt)} (en ${formatRemaining(endAt - now())}).`,
    };
  }

  return {
    setIn(text: string): { ok: boolean; message: string } {
      const parsed = parseDuration(text);
      return parsed.ok ? apply(now() + parsed.seconds * 1000) : parsed;
    },
    setAt(text: string): { ok: boolean; message: string } {
      const parsed = parseClockTime(text, now());
      return parsed.ok ? apply(parsed.endAt) : parsed;
    },
    cancel(): { ok: boolean; message: string } {
      return store.cancel()
        ? { ok: true, message: "Temporizador cancelado." }
        : { ok: true, message: "No hay ningún temporizador activo." };
    },
    status(): string {
      const state = store.getSnapshot();
      if (!state) return "No hay ningún temporizador activo.";
      return `Apagado a las ${clockLabel(state.endAt)}, faltan ${formatRemaining(state.endAt - now())}.`;
    },
  };
}
