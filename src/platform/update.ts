/**
 * Disponibilidad de actualizacion (offline-playback, "Actualizacion no
 * disruptiva"): un store observable propio (design.md D7), igual que
 * `AmbientMixer`/`AppearanceStore`. `main.tsx` lo alimenta desde
 * `onNeedRefresh` de `virtual:pwa-register`; `ui/App.tsx` decide, con el
 * estado de la mezcla en mano, si aplicarla enseguida o esperar a que el
 * usuario ejecute el comando `update`.
 */
type Listener = () => void;

export class UpdateStore {
  private available = false;
  private applyUpdate: (() => void) | null = null;
  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): boolean => this.available;

  /** Llamado desde `onNeedRefresh`: hay una version nueva esperando, `apply` es lo que la activa y recarga. */
  markAvailable(apply: () => void): void {
    this.available = true;
    this.applyUpdate = apply;
    for (const listener of this.listeners) listener();
  }

  apply(): void {
    this.applyUpdate?.();
  }
}
