import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, readConfig, writeConfig } from "./config";
import { SystemNoticeStore } from "./systemNotices";

function installFakeLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  return store;
}

describe("readConfig / writeConfig", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("devuelve los valores por defecto en el primer arranque, sin avisos", () => {
    const notices = new SystemNoticeStore();
    expect(readConfig(notices)).toEqual(DEFAULT_CONFIG);
    expect(notices.getSnapshot()).toEqual([]);
  });

  it("restaura el volumen maestro guardado en una sesion anterior", () => {
    writeConfig({ masterVolume: 0.75 });
    expect(readConfig()).toEqual({ masterVolume: 0.75 });
  });

  it("ante datos corruptos, arranca con valores por defecto e informa una vez", () => {
    localStorage.setItem("dark-echo.config", "{no es json valido");
    const notices = new SystemNoticeStore();

    expect(readConfig(notices)).toEqual(DEFAULT_CONFIG);
    expect(notices.getSnapshot()).toHaveLength(1);
  });

  it("informa una sola vez si la escritura queda denegada", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("escritura denegada");
      },
    });
    const notices = new SystemNoticeStore();

    writeConfig({ masterVolume: 0.5 }, notices);
    writeConfig({ masterVolume: 0.6 }, notices);

    expect(notices.getSnapshot()).toHaveLength(1);
  });
});
