import { useEffect, useState, useSyncExternalStore } from "react";
import type { SleepTimerState, SleepTimerStore } from "../../platform/sleepTimer";

/**
 * Estado del temporizador y tiempo restante, derivado de `endAt` en cada tick
 * de pantalla: no guarda una cuenta propia que pudiera desfasarse del store.
 */
export function useSleepTimer(store: SleepTimerStore): {
  state: SleepTimerState | null;
  remainingMs: number;
} {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state) return;
    // Al fijarlo, `now` puede venir de hace rato: se refresca antes del primer tick.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state]);

  return { state, remainingMs: state ? Math.max(0, state.endAt - now) : 0 };
}
