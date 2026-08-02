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
 *
 * El esquema guardado puede ser `"auto"`: sigue en vivo la preferencia del
 * sistema operativo hasta que el usuario fija `"dark"`/`"light"`
 * explícitamente. `getSnapshot` devuelve la preferencia cruda (puede ser
 * `"auto"`); `getEffectiveScheme` es la que hay que aplicar al DOM.
 */

const STORAGE_KEY = "dark-echo.appearance";
const STORAGE_VERSION = 1;

export interface AppearancePreference {
  themeId: string;
  scheme: Scheme;
}

type EffectiveScheme = "dark" | "light";
type Listener = () => void;

export function getSystemScheme(): EffectiveScheme {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveScheme(scheme: Scheme): EffectiveScheme {
  return scheme === "auto" ? getSystemScheme() : scheme;
}

function readInitialPreference(): AppearancePreference {
  const persisted = readFromStorage<AppearancePreference>(STORAGE_KEY, STORAGE_VERSION);
  if (persisted) return persisted;

  // Sin preferencia registrada: sigue la del sistema operativo en vivo
  // (theming, "Primer arranque sin preferencia registrada"). El tema por
  // defecto es el primero declarado en el registro.
  return { themeId: listThemes()[0].id, scheme: "auto" };
}

export class AppearanceStore {
  private preference: AppearancePreference;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.preference = readInitialPreference();
    this.applyToDom();

    // Sigue el esquema del sistema en vivo mientras la preferencia sea
    // "auto" — no solo en el primer arranque. Si el usuario ya fijó
    // "dark"/"light", el cambio se ignora.
    if (typeof matchMedia !== "undefined") {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (this.preference.scheme !== "auto") return;
        this.applyToDom();
        for (const listener of this.listeners) listener();
      });
    }
  }

  private applyToDom(): void {
    const root = document.documentElement;
    root.dataset.theme = this.preference.themeId;
    root.classList.toggle("light", resolveScheme(this.preference.scheme) === "light");
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppearancePreference => this.preference;

  /** El esquema realmente aplicado — resuelve `"auto"` contra el sistema. */
  getEffectiveScheme = (): EffectiveScheme => resolveScheme(this.preference.scheme);

  set(preference: AppearancePreference): void {
    this.preference = preference;
    this.applyToDom();
    writeToStorage(STORAGE_KEY, STORAGE_VERSION, preference);
    for (const listener of this.listeners) listener();
  }
}
