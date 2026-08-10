import { readConfig, writeConfig, type InterfaceMode } from "./config";
import type { SystemNoticeStore } from "./systemNotices";

/**
 * Modo de interfaz vigente (`command-console`, "Modo de interfaz
 * conmutable"), como store observable con el mismo patron que
 * `AppearanceStore`: `subscribe` / `getSnapshot` / `set`, consumido desde
 * React con `useSyncExternalStore`.
 *
 * No es un `useState` de `App.tsx` por tres razones concretas: el modo se
 * persiste, y la persistencia es responsabilidad de `platform/`; lo leen la
 * raiz y la barra de estado, a distinta profundidad del arbol; y un futuro
 * comando `mode` podria fijarlo sin que `commands/` conozca `ui/`, cosa que
 * la direccion de dependencias prohibe.
 */

type Listener = () => void;

export class InterfaceModeStore {
  private mode: InterfaceMode;
  private readonly notices?: SystemNoticeStore;
  private readonly listeners = new Set<Listener>();

  constructor(notices?: SystemNoticeStore) {
    this.notices = notices;
    this.mode = readConfig(notices).interfaceMode;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): InterfaceMode => this.mode;

  set(mode: InterfaceMode): void {
    if (mode === this.mode) return;
    this.mode = mode;

    // Se relee la configuracion en vez de recordar una copia: el volumen
    // maestro lo escribe el motor por su lado, y sobreescribirlo aqui con un
    // valor guardado al construir lo revertiria.
    const config = readConfig(this.notices);
    writeConfig({ ...config, interfaceMode: mode }, this.notices);

    for (const listener of this.listeners) listener();
  }

  toggle(): void {
    this.set(this.mode === "console" ? "visual" : "console");
  }
}
