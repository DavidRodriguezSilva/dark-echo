import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, readConfig, writeConfig } from "./config";
import { writeToStorage } from "./storage";
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
    writeConfig({ masterVolume: 0.75, interfaceMode: "console" });
    expect(readConfig()).toEqual({ masterVolume: 0.75, interfaceMode: "console" });
  });

  it("restaura el modo de interfaz elegido por el usuario", () => {
    writeConfig({ masterVolume: 0.5, interfaceMode: "visual" });
    expect(readConfig().interfaceMode).toBe("visual");
  });

  it("migra una configuracion v1 conservando el volumen maestro y adoptando modo visual", () => {
    // Sin la migracion declarada, `readVersioned` descartaria el registro y
    // el usuario perderia su volumen: es lo que este caso protege.
    writeToStorage("dark-echo.config", 1, { masterVolume: 0.9 });

    const config = readConfig();

    expect(config.masterVolume).toBe(0.9);
    expect(config.interfaceMode).toBe("visual");
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

    writeConfig({ masterVolume: 0.5, interfaceMode: "console" }, notices);
    writeConfig({ masterVolume: 0.6, interfaceMode: "console" }, notices);

    expect(notices.getSnapshot()).toHaveLength(1);
  });
});
