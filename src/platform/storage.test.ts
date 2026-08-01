import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFromStorage, writeToStorage } from "./storage";

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
