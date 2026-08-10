import { describe, expect, it } from "vitest";
import { extractBlock, mergeTokens } from "./cssTokens";

const SAMPLE_CSS = `
:root {
  --background: oklch(0.1 0 0);
  --foreground: oklch(0.9 0 0);
}

:root.light {
  --background: oklch(0.9 0 0);
}

[data-theme="ambar"] {
  --primary: oklch(0.8 0.15 70);
}
`;

describe("extractBlock", () => {
  it("extrae las declaraciones de un bloque exacto", () => {
    const tokens = extractBlock(SAMPLE_CSS, ":root");
    expect(tokens.get("--background")).toBe("oklch(0.1 0 0)");
    expect(tokens.get("--foreground")).toBe("oklch(0.9 0 0)");
  });

  it("no confunde :root con :root.light", () => {
    const tokens = extractBlock(SAMPLE_CSS, ":root");
    expect(tokens.size).toBe(2);
  });

  it("extrae un bloque de atributo con comillas", () => {
    const tokens = extractBlock(SAMPLE_CSS, '[data-theme="ambar"]');
    expect(tokens.get("--primary")).toBe("oklch(0.8 0.15 70)");
  });

  it("devuelve un mapa vacio si el bloque no existe", () => {
    expect(extractBlock(SAMPLE_CSS, '[data-theme="inexistente"]').size).toBe(0);
  });
});

describe("mergeTokens", () => {
  it("las declaraciones posteriores sobreescriben a las anteriores", () => {
    const base = new Map([["--background", "oklch(0.1 0 0)"]]);
    const override = new Map([["--background", "oklch(0.9 0 0)"]]);

    const merged = mergeTokens(base, override);
    expect(merged.get("--background")).toBe("oklch(0.9 0 0)");
  });

  it("conserva las claves que no se sobreescriben", () => {
    const base = new Map([
      ["--background", "oklch(0.1 0 0)"],
      ["--foreground", "oklch(0.9 0 0)"],
    ]);
    const override = new Map([["--primary", "oklch(0.8 0.15 70)"]]);

    const merged = mergeTokens(base, override);
    expect(merged.get("--foreground")).toBe("oklch(0.9 0 0)");
    expect(merged.get("--primary")).toBe("oklch(0.8 0.15 70)");
  });
});
