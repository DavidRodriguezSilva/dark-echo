import { readFromStorage, writeToStorage } from "./storage";
import { listThemes, type Scheme } from "../domain/themes";

/**
 * Aplica y persiste la apariencia (theming, "Persistencia y preferencia
 * inicial del tema"; "Selección de tema en caliente"). Sigue el mismo
 * patrón que `AmbientMixer` (design.md D7): un store observable propio,
 * mutado imperativamente por comandos o controles táctiles, al que React
 * se suscribe con `useSyncExternalStore`.
 *
 * La aplicación *antes del primer dibujado* no puede pasar por este
 * módulo — depende de un script sincrono en `index.html`, que usa a mano
 * la misma clave y el mismo formato (ver el comentario allí) porque no
 * puede esperar a que el grafo de módulos cargue.
 */

const STORAGE_KEY = "dark-echo.appearance";
const STORAGE_VERSION = 1;

export interface AppearancePreference {
  themeId: string;
  scheme: Scheme;
}

type Listener = () => void;

export function getSystemScheme(): Scheme {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readInitialPreference(): AppearancePreference {
  const persisted = readFromStorage<AppearancePreference>(STORAGE_KEY, STORAGE_VERSION);
  if (persisted) return persisted;

  // Sin preferencia registrada: adopta la del sistema operativo (theming,
  // "Primer arranque sin preferencia registrada"). El tema por defecto es
  // el primero declarado en el registro.
  return { themeId: listThemes()[0].id, scheme: getSystemScheme() };
}

export class AppearanceStore {
  private preference: AppearancePreference;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.preference = readInitialPreference();
    this.applyToDom();
  }

  private applyToDom(): void {
    const root = document.documentElement;
    root.dataset.theme = this.preference.themeId;
    root.classList.toggle("light", this.preference.scheme === "light");
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppearancePreference => this.preference;

  set(preference: AppearancePreference): void {
    this.preference = preference;
    this.applyToDom();
    writeToStorage(STORAGE_KEY, STORAGE_VERSION, preference);
    for (const listener of this.listeners) listener();
  }
}
