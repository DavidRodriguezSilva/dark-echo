import { describe, expect, it } from "vitest";
import { findAmbient, listAmbients } from "./catalog";

describe("catalog", () => {
  it("lista rain con su identificador y descripcion", () => {
    const list = listAmbients();
    expect(list).toContainEqual({ id: "rain", label: "Lluvia" });
  });

  it("encuentra un ambiente declarado por su id", () => {
    const ambient = findAmbient("rain");
    expect(ambient?.id).toBe("rain");
    expect(Object.keys(ambient?.layers ?? {})).toEqual(
      expect.arrayContaining(["cuerpo", "impactos", "goteo"])
    );
  });

  it("devuelve undefined para un ambiente inexistente", () => {
    expect(findAmbient("tormenta")).toBeUndefined();
  });

  it("el listado se deriva del catalogo: no hay una lista de nombres duplicada por separado", () => {
    const list = listAmbients();
    for (const { id } of list) {
      expect(findAmbient(id)).toBeDefined();
    }
  });
});
