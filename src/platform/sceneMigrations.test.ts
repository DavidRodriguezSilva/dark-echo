import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene } from "../domain/scene";
import { SCENE_FORMAT_VERSION, SCENE_MIGRATIONS } from "./sceneMigrations";
import { readVersioned, writeToStorage } from "./storage";

/**
 * Compatibilidad hacia atras del formato de escena
 * (`retire-legacy-engine`, tarea 2.4). Lo que se prueba no es que la funcion
 * de migracion haga algo —es la identidad—, sino que una escena escrita con
 * el formato del motor retirado **se siga leyendo** en vez de descartarse:
 * sin la migracion declarada, `readVersioned` la tira y el usuario pierde sus
 * escenas guardadas en silencio.
 */

const KEY = "dark-echo.test-scenes";

/** Node no tiene `localStorage` global: un polyfill minimo en memoria basta aqui. */
function installFakeLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
}

beforeEach(() => {
  installFakeLocalStorage();
});

describe("Formato de escena — lectura de la version anterior", () => {
  it("una escena v1 se lee sin descartarse", () => {
    // Formato v1: solo capas y volumenes, tal como lo escribia el motor de
    // ambientes retirado.
    writeToStorage(KEY, 1, { layers: { "rain.cuerpo": 0.5, "rain.impactos": 0.4 } });

    const result = readVersioned<Scene>(KEY, SCENE_FORMAT_VERSION, SCENE_MIGRATIONS);

    expect(result.status).toBe("migrated");
    if (result.status !== "migrated") return;
    expect(result.data.layers).toEqual({ "rain.cuerpo": 0.5, "rain.impactos": 0.4 });
  });

  it("una escena v1 se interpreta sin componentes de escena", () => {
    writeToStorage(KEY, 1, { layers: { "wind.cuerpo": 1 } });

    const result = readVersioned<Scene>(KEY, SCENE_FORMAT_VERSION, SCENE_MIGRATIONS);

    expect(result.status).toBe("migrated");
    if (result.status !== "migrated") return;
    expect(result.data.environment ?? null).toBeNull();
    expect(result.data.occlusion ?? null).toBeNull();
    expect(result.data.modifiers ?? {}).toEqual({});
  });

  it("sin la migracion declarada, la misma escena v1 se descartaria", () => {
    writeToStorage(KEY, 1, { layers: { "rain.cuerpo": 0.5 } });

    // Es el escenario que la migracion evita: sirve de guardia para que nadie
    // "simplifique" quitando SCENE_MIGRATIONS por parecer una lista vacia de
    // trabajo.
    const result = readVersioned<Scene>(KEY, SCENE_FORMAT_VERSION, []);

    expect(result.status).toBe("discarded");
  });

  it("una escena v2 se lee tal cual, con sus componentes", () => {
    const scene: Scene = {
      layers: { "rain.cuerpo": 0.5 },
      environment: "cabana",
      occlusion: "techo-madera",
      modifiers: { rain: { id: "distancia", meters: 40 } },
    };
    writeToStorage(KEY, SCENE_FORMAT_VERSION, scene);

    const result = readVersioned<Scene>(KEY, SCENE_FORMAT_VERSION, SCENE_MIGRATIONS);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).toEqual(scene);
  });

  it("la migracion reescribe el registro en la version vigente", () => {
    writeToStorage(KEY, 1, { layers: { "rain.cuerpo": 0.5 } });

    readVersioned<Scene>(KEY, SCENE_FORMAT_VERSION, SCENE_MIGRATIONS);

    const raw = JSON.parse(localStorage.getItem(KEY)!) as { version: number };
    expect(raw.version).toBe(SCENE_FORMAT_VERSION);
  });
});
