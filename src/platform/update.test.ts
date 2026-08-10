import { describe, expect, it } from "vitest";
import { UpdateStore } from "./update";

describe("UpdateStore", () => {
  it("empieza sin actualizacion disponible", () => {
    expect(new UpdateStore().getSnapshot()).toBe(false);
  });

  it("markAvailable marca la disponibilidad y notifica a los suscriptores", () => {
    const store = new UpdateStore();
    let notifications = 0;
    store.subscribe(() => notifications++);

    store.markAvailable(() => {});

    expect(store.getSnapshot()).toBe(true);
    expect(notifications).toBe(1);
  });

  it("apply invoca la funcion registrada por markAvailable", () => {
    const store = new UpdateStore();
    let applied = false;
    store.markAvailable(() => (applied = true));

    store.apply();

    expect(applied).toBe(true);
  });

  it("apply no lanza si se llama sin que haya actualizacion disponible", () => {
    const store = new UpdateStore();
    expect(() => store.apply()).not.toThrow();
  });
});
