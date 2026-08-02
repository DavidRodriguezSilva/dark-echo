import { readVersioned, writeToStorage } from "./storage";
import type { SystemNoticeStore } from "./systemNotices";

/**
 * Configuracion del usuario (session-persistence, "Persistencia de la
 * configuracion del usuario"): como minimo el volumen maestro, restaurado
 * al iniciar. Independiente de la escena/mezcla (`platform/lastMix.ts`):
 * el volumen maestro sobrevive aunque el usuario vacie la mezcla con
 * `reset`, porque es una preferencia, no parte de la composicion.
 */
export interface UserConfig {
  masterVolume: number;
}

const STORAGE_KEY = "dark-echo.config";
const STORAGE_VERSION = 1;

export const DEFAULT_CONFIG: UserConfig = { masterVolume: 0.5 };

/**
 * Lee la configuracion persistida. Ante datos ausentes no hay nada que
 * informar (primer arranque); ante datos descartados (corruptos o de una
 * version no migrable) se informa una vez a traves de `notices`, y se
 * continua con los valores por defecto documentados en `DEFAULT_CONFIG`.
 */
export function readConfig(notices?: SystemNoticeStore): UserConfig {
  const result = readVersioned<UserConfig>(STORAGE_KEY, STORAGE_VERSION);
  if (result.status === "ok" || result.status === "migrated") return result.data;

  if (result.status === "discarded") {
    notices?.push("No se pudo leer la configuración guardada; se usan los valores por defecto.");
  }
  return DEFAULT_CONFIG;
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
