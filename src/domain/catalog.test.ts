import { describe, expect, it } from "vitest";
import { findAmbient, listAmbients } from "./catalog";

describe("catalog", () => {
  it("lista los cuatro ambientes con su identificador y descripcion", () => {
    const list = listAmbients();
    expect(list).toContainEqual({ id: "rain", label: "Lluvia" });
    expect(list).toContainEqual({ id: "wind", label: "Viento" });
    expect(list).toContainEqual({ id: "river", label: "Río" });
    expect(list).toContainEqual({ id: "ocean", label: "Océano" });
    expect(list).toHaveLength(4);
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
