import { readVersioned, writeToStorage, type Migration } from "./storage";
import type { SystemNoticeStore } from "./systemNotices";

/**
 * Configuracion del usuario (session-persistence, "Persistencia de la
 * configuracion del usuario"): el volumen maestro y el modo de interfaz,
 * restaurados al iniciar. Independiente de la escena/mezcla
 * (`platform/lastMix.ts`): el volumen maestro sobrevive aunque el usuario
 * vacie la mezcla con `reset`, porque es una preferencia, no parte de la
 * composicion.
 */

/** Modo de interfaz: la consola de comandos o los controles graficos. */
export type InterfaceMode = "console" | "visual";

export interface UserConfig {
  masterVolume: number;
  interfaceMode: InterfaceMode;
}

const STORAGE_KEY = "dark-echo.config";
const STORAGE_VERSION = 2;

/**
 * Modo inicial cuando el usuario no ha elegido todavia: **visual en un
 * dispositivo tactil, consola en uno de escritorio**.
 *
 * La consola exige teclado fisico para ser usable, y en un movil ese teclado
 * ocupa media pantalla y no tiene tecla de tabulacion para el autocompletado;
 * arrancar ahi en consola es arrancar en el modo peor. Se consulta el tipo de
 * puntero y no el ancho de la ventana ni el `userAgent`: lo que decide no es
 * el tamaño de la pantalla sino si el puntero es un dedo — una tableta grande
 * sigue queriendo el modo visual, y una ventana estrecha en un escritorio con
 * raton no.
 *
 * Esto solo elige el punto de partida. En cuanto el usuario conmuta, su
 * preferencia queda registrada y manda siempre.
 */
export function defaultInterfaceMode(): InterfaceMode {
  if (typeof matchMedia === "undefined") return "console";
  return matchMedia("(pointer: coarse)").matches ? "visual" : "console";
}

export const DEFAULT_CONFIG: UserConfig = { masterVolume: 0.5, interfaceMode: "console" };

/**
 * Migracion 1 -> 2: se añade `interfaceMode`. Es **obligatoria, no opcional**:
 * `readVersioned` descarta el dato cuando no encuentra una migracion que
 * alcance la version vigente, asi que subir la version sin registrarla haria
 * que todos los usuarios existentes perdieran su volumen maestro.
 *
 * El modo se resuelve por dispositivo, igual que en un primer arranque: quien
 * ya usaba la aplicacion nunca eligio un modo, asi que no hay preferencia que
 * respetar todavia.
 */
const MIGRATIONS: Migration[] = [
  {
    fromVersion: 1,
    migrate: (data) => ({
      ...(data as { masterVolume: number }),
      interfaceMode: defaultInterfaceMode(),
    }),
  },
];

/**
 * Lee la configuracion persistida. Ante datos ausentes no hay nada que
 * informar (primer arranque); ante datos descartados (corruptos o de una
 * version no migrable) se informa una vez a traves de `notices`, y se
 * continua con los valores por defecto.
 */
export function readConfig(notices?: SystemNoticeStore): UserConfig {
  const result = readVersioned<UserConfig>(STORAGE_KEY, STORAGE_VERSION, MIGRATIONS);
  if (result.status === "ok" || result.status === "migrated") {
    // Un registro escrito por una version anterior de esta misma version 2
    // podria no traer el campo; se resuelve por dispositivo en vez de asumir.
    return { ...result.data, interfaceMode: result.data.interfaceMode ?? defaultInterfaceMode() };
  }

  if (result.status === "discarded") {
    notices?.push("No se pudo leer la configuración guardada; se usan los valores por defecto.");
  }
  return { ...DEFAULT_CONFIG, interfaceMode: defaultInterfaceMode() };
}

export function writeConfig(config: UserConfig, notices?: SystemNoticeStore): void {
  const persisted = writeToStorage(STORAGE_KEY, STORAGE_VERSION, config);
  if (!persisted) {
    notices?.pushOnce(
      "config-write-denied",
      "El almacenamiento no admite escritura; los cambios de configuración no sobrevivirán a esta sesión."
    );
  }
}
