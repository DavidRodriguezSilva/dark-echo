import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFromStorage, readVersioned, writeToStorage } from "./storage";

/** Node no tiene `localStorage` global: un polyfill minimo en memoria basta aqui. */
function installFakeLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  return store;
}

describe("readFromStorage / writeToStorage", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("escribe y vuelve a leer el mismo dato", () => {
    writeToStorage("historial", 1, ["play rain", "stop"]);
    expect(readFromStorage("historial", 1)).toEqual(["play rain", "stop"]);
  });

  it("devuelve undefined si no hay nada guardado", () => {
    expect(readFromStorage("nada", 1)).toBeUndefined();
  });

  it("descarta el dato si la version guardada no coincide", () => {
    writeToStorage("historial", 1, ["play rain"]);
    expect(readFromStorage("historial", 2)).toBeUndefined();
  });

  it("no lanza y devuelve undefined ante contenido corrupto", () => {
    localStorage.setItem("historial", "{esto no es json valido");
    expect(readFromStorage("historial", 1)).toBeUndefined();
  });

  it("no lanza si localStorage.getItem lanza (almacenamiento no disponible)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("almacenamiento no disponible");
      },
      setItem: () => {
        throw new Error("almacenamiento no disponible");
      },
    });

    expect(readFromStorage("historial", 1)).toBeUndefined();
    expect(writeToStorage("historial", 1, ["play rain"])).toBe(false);
  });
});

describe("readVersioned", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("devuelve 'absent' si no hay nada guardado, sin tratarlo como descarte", () => {
    expect(readVersioned("config", 1)).toEqual({ status: "absent" });
  });

  it("devuelve 'ok' cuando la version guardada coincide con la vigente", () => {
    writeToStorage("config", 1, { masterVolume: 0.4 });
    expect(readVersioned("config", 1)).toEqual({ status: "ok", data: { masterVolume: 0.4 } });
  });

  it("migra en cadena hasta la version vigente y persiste el resultado migrado", () => {
    // Formato v1 hipotetico: campo "volume" en escala 0-100 en vez de 0-1.
    writeToStorage("config", 1, { volume: 40 });

    const migrations = [
      {
        fromVersion: 1,
        migrate: (data: unknown) => ({ masterVolume: (data as { volume: number }).volume / 100 }),
      },
    ];

    const result = readVersioned("config", 2, migrations);
    expect(result).toEqual({ status: "migrated", data: { masterVolume: 0.4 } });

    // El resultado migrado queda guardado en el formato vigente.
    expect(readVersioned("config", 2, migrations)).toEqual({
      status: "ok",
      data: { masterVolume: 0.4 },
    });
  });

  it("aplica mas de una migracion en cadena cuando hace falta", () => {
    writeToStorage("config", 1, { volume: 40 });

    const migrations = [
      {
        fromVersion: 1,
        migrate: (data: unknown) => ({ masterVolume: (data as { volume: number }).volume / 100 }),
      },
      {
        fromVersion: 2,
        migrate: (data: unknown) => ({ ...(data as object), consoleTheme: "default" }),
      },
    ];

    expect(readVersioned("config", 3, migrations)).toEqual({
      status: "migrated",
      data: { masterVolume: 0.4, consoleTheme: "default" },
    });
  });

  it("descarta el dato cuando no existe migracion que alcance la version vigente", () => {
    writeToStorage("config", 1, { volume: 40 });
    expect(readVersioned("config", 2, [])).toEqual({ status: "discarded" });
  });

  it("descarta ante contenido corrupto en lugar de lanzar", () => {
    localStorage.setItem("config", "{esto no es json valido");
    expect(readVersioned("config", 1)).toEqual({ status: "discarded" });
  });
});
