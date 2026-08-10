import { readVersioned, writeToStorage } from "./storage";
import { SCENE_FORMAT_VERSION, SCENE_MIGRATIONS } from "./sceneMigrations";
import type { Scene } from "../domain/scene";
import type { SystemNoticeStore } from "./systemNotices";

/**
 * Recuerdo de la ultima mezcla (session-persistence, "Restauracion de la
 * ultima mezcla"): la composicion activa al cerrar la aplicacion, para
 * restaurarla en estado detenido al volver a abrirla. Se guarda en cada
 * cambio de mezcla (ver `ui/App.tsx`), no solo al cerrar — no hay un evento
 * de cierre fiable en una PWA, así que la ultima escritura antes de cerrar
 * es, por construccion, el estado de cierre.
 */
const STORAGE_KEY = "dark-echo.last-mix";
const STORAGE_VERSION = SCENE_FORMAT_VERSION;

export function readLastMix(notices?: SystemNoticeStore): Scene | undefined {
  const result = readVersioned<Scene | null>(STORAGE_KEY, STORAGE_VERSION, SCENE_MIGRATIONS);
  if (result.status === "ok" || result.status === "migrated") return result.data ?? undefined;

  if (result.status === "discarded") {
    notices?.push("No se pudo leer la última mezcla guardada; se arranca sin mezcla que reanudar.");
  }
  return undefined;
}

/** `null` borra el recuerdo (p. ej. tras un `reset` explicito). */
export function writeLastMix(mix: Scene | null, notices?: SystemNoticeStore): void {
  const persisted = writeToStorage(STORAGE_KEY, STORAGE_VERSION, mix);
  if (!persisted) {
    notices?.pushOnce(
      "last-mix-write-denied",
      "El almacenamiento no admite escritura; la mezcla no se recordará entre sesiones."
    );
  }
}
