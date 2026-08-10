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
 * Modo inicial cuando el usuario no ha elegido todavia: **siempre visual**,
 * en cualquier dispositivo (`update-interface-design`, design.md D15).
 *
 * Antes se decidia por tipo de puntero — visual en tactil, consola en
 * escritorio — porque el modo visual no cubria todavia la composicion
 * completa y era, en escritorio, la opcion peor. Con el modo visual como
 * superconjunto estricto de la consola, ramificar por dispositivo solo
 * conseguia que dos personas vieran un producto distinto en su primer
 * arranque, sin que el spec pudiera declarar un comportamiento unico.
 *
 * Esto solo elige el punto de partida. En cuanto el usuario conmuta, su
 * preferencia queda registrada y manda siempre.
 */
export function defaultInterfaceMode(): InterfaceMode {
  return "visual";
}

export const DEFAULT_CONFIG: UserConfig = { masterVolume: 0.5, interfaceMode: "visual" };

/**
 * Migracion 1 -> 2: se añade `interfaceMode`. Es **obligatoria, no opcional**:
 * `readVersioned` descarta el dato cuando no encuentra una migracion que
 * alcance la version vigente, asi que subir la version sin registrarla haria
 * que todos los usuarios existentes perdieran su volumen maestro.
 *
 * El modo se resuelve como en un primer arranque (`defaultInterfaceMode`):
 * quien ya usaba la aplicacion nunca eligio un modo, asi que no hay
 * preferencia que respetar todavia.
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
    // podria no traer el campo; se resuelve como en un primer arranque.
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
