import { describe, expect, it } from "vitest";
import { usageString, validateForms } from "./validate";
import type { CommandForm } from "./types";

describe("validateForms", () => {
  it("valida un unico argumento de tipo enum", () => {
    const forms: CommandForm[] = [
      { args: [{ name: "ambiente", type: "enum", values: ["rain", "wind"] }] },
    ];

    const result = validateForms(["rain"], forms, "play");
    expect(result).toEqual({ ok: true, args: { ambiente: "rain" } });
  });

  it("rechaza un valor fuera del conjunto enum con un error accionable", () => {
    const forms: CommandForm[] = [
      { args: [{ name: "ambiente", type: "enum", values: ["rain", "wind"] }] },
    ];

    const result = validateForms(["fuego"], forms, "play");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("rain, wind");
      expect(result.message).toContain("fuego");
    }
  });

  it("convierte y valida un numero dentro de rango", () => {
    const forms: CommandForm[] = [{ args: [{ name: "valor", type: "number", range: [0, 1] }] }];

    const result = validateForms(["0.5"], forms, "volume");
    expect(result).toEqual({ ok: true, args: { valor: 0.5 } });
  });

  it("rechaza un numero fuera de rango indicando el rango admitido", () => {
    const forms: CommandForm[] = [{ args: [{ name: "valor", type: "number", range: [0, 1] }] }];

    const result = validateForms(["5"], forms, "volume");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("entre 0 y 1");
  });

  it("rechaza un valor no numerico indicando el tipo esperado", () => {
    const forms: CommandForm[] = [{ args: [{ name: "valor", type: "number", range: [0, 1] }] }];

    const result = validateForms(["alto"], forms, "volume");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("número");
  });

  it("indica el argumento que falta cuando la aridad no coincide con ninguna forma", () => {
    const forms: CommandForm[] = [{ args: [{ name: "ambiente", type: "string" }] }];

    const result = validateForms([], forms, "play");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("play <ambiente>");
  });

  it("desambigua entre formas de distinta aridad (volume maestro vs volume de capa)", () => {
    const forms: CommandForm[] = [
      { args: [{ name: "valor", type: "number", range: [0, 1] }] },
      {
        args: [
          { name: "capa", type: "string" },
          { name: "valor", type: "number", range: [0, 1] },
        ],
      },
    ];

    const master = validateForms(["0.4"], forms, "volume");
    expect(master).toEqual({ ok: true, args: { valor: 0.4 } });

    const perLayer = validateForms(["rain", "0.4"], forms, "volume");
    expect(perLayer).toEqual({ ok: true, args: { capa: "rain", valor: 0.4 } });
  });

  it("acepta la ausencia de argumentos cuando una de las formas admite cero", () => {
    const forms: CommandForm[] = [{ args: [] }, { args: [{ name: "ambiente", type: "string" }] }];

    const result = validateForms([], forms, "play");
    expect(result).toEqual({ ok: true, args: {} });
  });
});

describe("usageString", () => {
  it("compone el nombre del comando con sus argumentos entre angulos", () => {
    const usage = usageString("volume", {
      args: [
        { name: "capa", type: "string" },
        { name: "valor", type: "number" },
      ],
    });

    expect(usage).toBe("volume <capa> <valor>");
  });
});
