import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterfaceModeStore } from "./interfaceMode";
import { readConfig, writeConfig } from "./config";

/**
 * Store del modo de interfaz (`add-visual-control-mode`, tarea 2.3).
 */

function installFakeLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
}

/** Simula un dispositivo tactil o de escritorio segun el tipo de puntero. */
function stubPointer(coarse: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("pointer: coarse") ? coarse : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  installFakeLocalStorage();
  stubPointer(false);
});

describe("InterfaceModeStore — valor inicial", () => {
  it("sin preferencia registrada arranca en consola en un escritorio", () => {
    stubPointer(false);
    expect(new InterfaceModeStore().getSnapshot()).toBe("console");
  });

  it("sin preferencia registrada arranca en visual en un dispositivo tactil", () => {
    stubPointer(true);
    expect(new InterfaceModeStore().getSnapshot()).toBe("visual");
  });

  it("una preferencia registrada manda sobre el tipo de dispositivo", () => {
    // El usuario de escritorio que eligio el modo visual lo conserva.
    stubPointer(false);
    writeConfig({ masterVolume: 0.5, interfaceMode: "visual" });

    expect(new InterfaceModeStore().getSnapshot()).toBe("visual");
  });

  it("un usuario tactil que eligio la consola la conserva", () => {
    stubPointer(true);
    writeConfig({ masterVolume: 0.5, interfaceMode: "console" });

    expect(new InterfaceModeStore().getSnapshot()).toBe("console");
  });
});

describe("InterfaceModeStore — cambio y notificacion", () => {
  it("toggle alterna entre los dos modos", () => {
    const store = new InterfaceModeStore();
    expect(store.getSnapshot()).toBe("console");

    store.toggle();
    expect(store.getSnapshot()).toBe("visual");

    store.toggle();
    expect(store.getSnapshot()).toBe("console");
  });

  it("notifica a los suscriptores en cada cambio", () => {
    const store = new InterfaceModeStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => notifications++);

    store.set("visual");
    expect(notifications).toBe(1);

    store.set("console");
    expect(notifications).toBe(2);

    unsubscribe();
    store.set("visual");
    expect(notifications).toBe(2);
  });

  it("fijar el mismo modo no notifica ni reescribe", () => {
    const store = new InterfaceModeStore();
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.set("console");

    expect(notifications).toBe(0);
  });

  it("persiste el modo elegido", () => {
    const store = new InterfaceModeStore();
    store.set("visual");

    expect(readConfig().interfaceMode).toBe("visual");
  });

  it("cambiar de modo no pisa el volumen maestro guardado", () => {
    // El motor escribe el volumen por su lado: si el store recordara una copia
    // de la configuracion al construirse, la revertiria al conmutar.
    const store = new InterfaceModeStore();
    writeConfig({ ...readConfig(), masterVolume: 0.85 });

    store.set("visual");

    expect(readConfig().masterVolume).toBe(0.85);
    expect(readConfig().interfaceMode).toBe("visual");
  });
});
