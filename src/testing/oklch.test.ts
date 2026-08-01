import { describe, expect, it } from "vitest";
import { contrastRatio, parseOklch, relativeLuminance } from "./oklch";

describe("parseOklch", () => {
  it("extrae L, C, H de una declaracion oklch simple", () => {
    expect(parseOklch("oklch(0.815 0.135 158)")).toEqual({ l: 0.815, c: 0.135, h: 158 });
  });

  it("ignora el canal alfa si esta presente", () => {
    expect(parseOklch("oklch(0.12 0 0 / 0.72)")).toEqual({ l: 0.12, c: 0, h: 0 });
  });

  it("devuelve null para un valor que no es oklch", () => {
    expect(parseOklch("var(--primary)")).toBeNull();
    expect(parseOklch("#ffffff")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("blanco puro (L=1, C=0) tiene luminancia 1", () => {
    expect(relativeLuminance({ l: 1, c: 0, h: 0 })).toBeCloseTo(1, 5);
  });

  it("negro puro (L=0, C=0) tiene luminancia 0", () => {
    expect(relativeLuminance({ l: 0, c: 0, h: 0 })).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("negro contra blanco da el contraste maximo de WCAG (21:1)", () => {
    const black = { l: 0, c: 0, h: 0 };
    const white = { l: 1, c: 0, h: 0 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
  });

  it("un color contra si mismo da un contraste de 1:1", () => {
    const color = { l: 0.5, c: 0.1, h: 200 };
    expect(contrastRatio(color, color)).toBeCloseTo(1, 5);
  });

  it("es simetrico: el orden de los argumentos no importa", () => {
    const a = { l: 0.2, c: 0.05, h: 30 };
    const b = { l: 0.9, c: 0.02, h: 200 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});
