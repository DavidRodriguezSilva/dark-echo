import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLastMix, writeLastMix } from "./lastMix";
import { PersistenceNoticeStore } from "./persistenceNotices";

function installFakeLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  return store;
}

describe("readLastMix / writeLastMix", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("no hay nada que reanudar en el primer arranque", () => {
    expect(readLastMix()).toBeUndefined();
  });

  it("restaura exactamente la composicion guardada", () => {
    writeLastMix({ layers: { "rain.cuerpo": 0.8, "rain.goteo": 0.3 } });
    expect(readLastMix()).toEqual({ layers: { "rain.cuerpo": 0.8, "rain.goteo": 0.3 } });
  });

  it("un reset explicito (null) borra el recuerdo", () => {
    writeLastMix({ layers: { "rain.cuerpo": 0.8 } });
    writeLastMix(null);
    expect(readLastMix()).toBeUndefined();
  });

  it("ante datos corruptos, no hay mezcla que reanudar e informa una vez", () => {
    localStorage.setItem("dark-echo.last-mix", "{no es json valido");
    const notices = new PersistenceNoticeStore();

    expect(readLastMix(notices)).toBeUndefined();
    expect(notices.getSnapshot()).toHaveLength(1);
  });
});
