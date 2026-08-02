import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceStore } from "./appearance";

function installFakeLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  return store;
}

/** Fake minimo de `document.documentElement`: solo lo que `AppearanceStore` toca. */
function installFakeDocument() {
  const classes = new Set<string>();
  const documentElement = {
    dataset: {} as Record<string, string>,
    classList: {
      toggle(name: string, force?: boolean) {
        const shouldAdd = force ?? !classes.has(name);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
      },
      contains: (name: string) => classes.has(name),
    },
  };
  vi.stubGlobal("document", { documentElement });
  return documentElement;
}

/** Fake de `matchMedia("(prefers-color-scheme: dark)")` que puede simular un cambio del sistema. */
function installFakeMatchMedia(initialSystemDark: boolean) {
  let matches = initialSystemDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (_query: string) => ({
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_type: string, callback: () => void) => listeners.delete(callback),
  }));
  return {
    setSystemDark(value: boolean) {
      matches = value;
      for (const callback of listeners) callback();
    },
  };
}

describe("AppearanceStore — esquema auto", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("sin preferencia guardada, el valor por defecto es 'auto'", () => {
    installFakeMatchMedia(false);
    installFakeDocument();

    const store = new AppearanceStore();
    expect(store.getSnapshot().scheme).toBe("auto");
  });

  it("en modo auto, el esquema efectivo se resuelve contra el sistema", () => {
    installFakeMatchMedia(true);
    installFakeDocument();

    const store = new AppearanceStore();
    expect(store.getEffectiveScheme()).toBe("dark");
  });

  it("sigue el esquema del sistema en vivo mientras la preferencia sea 'auto'", () => {
    const media = installFakeMatchMedia(false);
    const documentElement = installFakeDocument();

    const store = new AppearanceStore();
    expect(store.getEffectiveScheme()).toBe("light");
    expect(documentElement.classList.contains("light")).toBe(true);

    let notifications = 0;
    store.subscribe(() => notifications++);

    media.setSystemDark(true);

    expect(store.getEffectiveScheme()).toBe("dark");
    expect(documentElement.classList.contains("light")).toBe(false);
    expect(notifications).toBe(1);
  });

  it("deja de reaccionar al sistema tras fijar 'dark'/'light' explícito", () => {
    const media = installFakeMatchMedia(false);
    installFakeDocument();

    const store = new AppearanceStore();
    store.set({ themeId: "default", scheme: "dark" });

    let notifications = 0;
    store.subscribe(() => notifications++);

    media.setSystemDark(true);

    expect(store.getSnapshot().scheme).toBe("dark");
    expect(store.getEffectiveScheme()).toBe("dark");
    expect(notifications).toBe(0);
  });

  it("aplica el tema y el esquema efectivo al elemento raíz", () => {
    installFakeMatchMedia(false);
    const documentElement = installFakeDocument();

    const store = new AppearanceStore();
    store.set({ themeId: "ambar", scheme: "light" });

    expect(documentElement.dataset.theme).toBe("ambar");
    expect(documentElement.classList.contains("light")).toBe(true);
  });
});
