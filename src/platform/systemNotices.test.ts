import { describe, expect, it } from "vitest";
import { SystemNoticeStore } from "./systemNotices";

describe("SystemNoticeStore", () => {
  it("empieza vacio", () => {
    expect(new SystemNoticeStore().getSnapshot()).toEqual([]);
  });

  it("acumula avisos en orden", () => {
    const store = new SystemNoticeStore();
    store.push("primero");
    store.push("segundo");
    expect(store.getSnapshot()).toEqual(["primero", "segundo"]);
  });

  it("pushOnce no repite el mismo aviso para la misma clave", () => {
    const store = new SystemNoticeStore();
    store.pushOnce("escritura-denegada", "no se pudo escribir");
    store.pushOnce("escritura-denegada", "no se pudo escribir de nuevo");
    expect(store.getSnapshot()).toEqual(["no se pudo escribir"]);
  });

  it("notifica a los suscriptores en cada push", () => {
    const store = new SystemNoticeStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => notifications++);

    store.push("aviso");
    expect(notifications).toBe(1);

    unsubscribe();
    store.push("otro aviso");
    expect(notifications).toBe(1);
  });
});
