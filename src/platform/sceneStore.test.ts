import { beforeEach, describe, expect, it, vi } from "vitest";
import { SceneStore } from "./sceneStore";
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

describe("SceneStore", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("empieza sin escenas guardadas", () => {
    const store = new SceneStore();
    expect(store.list()).toEqual([]);
    expect(store.load("lluvia")).toBeUndefined();
  });

  it("guarda y recarga exactamente la misma composicion", () => {
    const store = new SceneStore();
    const scene = { layers: { "rain.cuerpo": 0.8, "wind.rafagas": 0.4 } };

    const result = store.save("lluvia con viento", scene, false);
    expect(result).toEqual({ status: "saved", overwritten: false });
    expect(store.load("lluvia con viento")).toEqual(scene);
  });

  it("los nombres son unicos: guardar sobre uno existente exige overwrite explicito", () => {
    const store = new SceneStore();
    store.save("lluvia", { layers: { "rain.cuerpo": 0.5 } }, false);

    const withoutOverwrite = store.save("lluvia", { layers: { "rain.cuerpo": 0.9 } }, false);
    expect(withoutOverwrite).toEqual({ status: "exists" });
    expect(store.load("lluvia")).toEqual({ layers: { "rain.cuerpo": 0.5 } });

    const withOverwrite = store.save("lluvia", { layers: { "rain.cuerpo": 0.9 } }, true);
    expect(withOverwrite).toEqual({ status: "saved", overwritten: true });
    expect(store.load("lluvia")).toEqual({ layers: { "rain.cuerpo": 0.9 } });
  });

  it("lista los nombres guardados en orden alfabetico", () => {
    const store = new SceneStore();
    store.save("zeta", { layers: {} }, false);
    store.save("alfa", { layers: {} }, false);
    expect(store.list()).toEqual(["alfa", "zeta"]);
  });

  it("eliminar una escena la retira del listado", () => {
    const store = new SceneStore();
    store.save("lluvia", { layers: { "rain.cuerpo": 0.5 } }, false);

    expect(store.remove("lluvia")).toBe(true);
    expect(store.list()).toEqual([]);
    expect(store.remove("lluvia")).toBe(false);
  });

  it("persiste entre instancias (sobrevive a reabrir la aplicacion)", () => {
    const first = new SceneStore();
    first.save("lluvia", { layers: { "rain.cuerpo": 0.5 } }, false);

    const second = new SceneStore();
    expect(second.list()).toEqual(["lluvia"]);
    expect(second.load("lluvia")).toEqual({ layers: { "rain.cuerpo": 0.5 } });
  });

  it("ante escenas guardadas corruptas, arranca sin escenas e informa una vez", () => {
    localStorage.setItem("dark-echo.scenes", "{no es json valido");
    const notices = new PersistenceNoticeStore();

    const store = new SceneStore(notices);
    expect(store.list()).toEqual([]);
    expect(notices.getSnapshot()).toHaveLength(1);
  });

  it("con escritura denegada, guardar sigue funcionando en memoria e informa una vez", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("escritura denegada");
      },
    });
    const notices = new PersistenceNoticeStore();
    const store = new SceneStore(notices);

    store.save("lluvia", { layers: { "rain.cuerpo": 0.5 } }, false);
    store.save("viento", { layers: { "wind.rafagas": 0.5 } }, false);

    expect(store.list()).toEqual(["lluvia", "viento"]);
    expect(notices.getSnapshot()).toHaveLength(1);
  });
});
