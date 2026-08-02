import { readVersioned, writeToStorage } from "./storage";
import type { Scene } from "../domain/scene";
import type { PersistenceNoticeStore } from "./persistenceNotices";

/**
 * Escenas guardadas (session-persistence, "Gestion de escenas sonoras"): un
 * unico registro para todas (design.md D9), guardar/listar/cargar/eliminar
 * son mutaciones sobre ese registro. Mantiene una copia en memoria como
 * fuente de verdad de la sesion — si la escritura queda denegada, guardar
 * sigue funcionando para lo que resta de sesion (session-persistence,
 * "Escritura denegada por el entorno"), solo no sobrevive al cierre.
 */
export type SceneSaveResult = { status: "saved"; overwritten: boolean } | { status: "exists" };

export class SceneStore {
  private scenes: Record<string, Scene>;
  private readonly notices?: PersistenceNoticeStore;

  constructor(notices?: PersistenceNoticeStore) {
    this.notices = notices;
    const result = readVersioned<Record<string, Scene>>("dark-echo.scenes", 1);
    if (result.status === "ok" || result.status === "migrated") {
      this.scenes = result.data;
    } else {
      this.scenes = {};
      if (result.status === "discarded") {
        notices?.push("No se pudieron leer las escenas guardadas; se arranca sin escenas.");
      }
    }
  }

  list(): string[] {
    return Object.keys(this.scenes).sort();
  }

  save(name: string, scene: Scene, overwrite: boolean): SceneSaveResult {
    const existed = name in this.scenes;
    if (existed && !overwrite) {
      return { status: "exists" };
    }

    this.scenes = { ...this.scenes, [name]: scene };
    this.persist();
    return { status: "saved", overwritten: existed };
  }

  load(name: string): Scene | undefined {
    return this.scenes[name];
  }

  remove(name: string): boolean {
    if (!(name in this.scenes)) return false;
    const rest = { ...this.scenes };
    delete rest[name];
    this.scenes = rest;
    this.persist();
    return true;
  }

  private persist(): void {
    const persisted = writeToStorage("dark-echo.scenes", 1, this.scenes);
    if (!persisted) {
      this.notices?.pushOnce(
        "scenes-write-denied",
        "El almacenamiento no admite escritura; los cambios en las escenas no sobrevivirán a esta sesión."
      );
    }
  }
}
