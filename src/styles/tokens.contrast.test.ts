import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listThemes } from "../domain/themes";
import { extractBlock, mergeTokens, type TokenMap } from "../testing/cssTokens";
import { contrastRatio, parseOklch } from "../testing/oklch";

/**
 * Verificación automatizada de contraste (theming, "Contraste verificado de
 * cada tema"): para cada tema declarado y cada esquema, cada par de
 * superficie y texto asociado del contrato debe alcanzar AA de WCAG (4.5:1).
 *
 * **Qué cubre (tarea 13.8):**
 * - Los ocho pares de superficie/texto del contrato base, para cada
 *   combinación de tema × esquema declarada — hoy 2 temas × 2 esquemas = 4
 *   combinaciones, 32 verificaciones.
 * - El umbral usado es el de **texto normal** (4.5:1). Si algún componente
 *   llegara a usar un token de este contrato para texto grande (18pt+ o
 *   14pt+ en negrita), ese uso concreto podría pasar con un contraste menor
 *   (3:1) sin que este test lo refleje — no hay hoy ningún componente así.
 * - Que cada tema declarado en `domain/themes.ts` tenga su bloque
 *   correspondiente en `tokens.css` (evita que ambos queden desincronizados).
 *
 * **Qué NO cubre:**
 * - Los tokens de dominio (`--terminal-prompt`, `--terminal-cursor`, etc.)
 *   no se verifican por separado: por diseño, referencian `var()` sobre los
 *   tokens base ya verificados, así que su contraste es el mismo que el del
 *   token que aliasan. Si un tema llegara a *sobreescribir* directamente un
 *   token de dominio con un valor propio (no solo heredarlo), ese valor
 *   quedaría fuera de esta verificación a menos que se añada explícitamente.
 * - Elementos no textuales (iconos, bordes finos, el propio cursor
 *   parpadeante): WCAG AA de contraste de texto no aplica a ellos de la
 *   misma forma, y este test no los mide.
 * - Texto sobre una superficie *compuesta* (p. ej. un degradado, o texto que
 *   se superpone a una imagen): el contrato asume superficies planas de un
 *   solo color, que es lo único que hay hoy.
 * - WCAG 2 opera en sRGB; los valores OKLCH se convierten a RGB lineal para
 *   medir (ver `testing/oklch.ts`), con clamping si un color queda fuera de
 *   gama sRGB — una conversión, no una medición directa del espacio OKLCH.
 *
 * La revisión visual directa de cada tema ("a ojo", tarea 13.8) sigue siendo
 * necesaria además de esto: pasar este test no implica que un tema se vea
 * bien, solo que su texto es legible según un umbral objetivo.
 */

const CSS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const WCAG_AA_NORMAL_TEXT = 4.5;

const SURFACE_TEXT_PAIRS: [string, string][] = [
  ["--background", "--foreground"],
  ["--panel", "--panel-foreground"],
  ["--popover", "--popover-foreground"],
  ["--muted", "--muted-foreground"],
  ["--accent", "--accent-foreground"],
  ["--primary", "--primary-foreground"],
  ["--secondary", "--secondary-foreground"],
  ["--destructive", "--destructive-foreground"],
];

function effectiveTokens(themeId: string, scheme: "dark" | "light"): TokenMap {
  const rootDark = extractBlock(CSS, ":root");
  const rootLight = scheme === "light" ? extractBlock(CSS, ":root.light") : new Map();

  const isDefault = themeId === "default";
  const themeDark = isDefault ? new Map() : extractBlock(CSS, `[data-theme="${themeId}"]`);
  const themeLight =
    isDefault || scheme !== "light"
      ? new Map()
      : extractBlock(CSS, `[data-theme="${themeId}"].light`);

  return mergeTokens(rootDark, rootLight, themeDark, themeLight);
}

describe("contrato de tokens — bloques CSS presentes", () => {
  it("cada tema declarado en domain/themes.ts tiene su bloque en tokens.css (o es el tema por defecto)", () => {
    for (const theme of listThemes()) {
      if (theme.id === "default") continue;
      const darkBlock = extractBlock(CSS, `[data-theme="${theme.id}"]`);
      expect(darkBlock.size, `[data-theme="${theme.id}"] no tiene declaraciones`).toBeGreaterThan(
        0
      );
    }
  });
});

describe("contraste AA de cada tema y esquema", () => {
  for (const theme of listThemes()) {
    for (const scheme of ["dark", "light"] as const) {
      describe(`${theme.id} — esquema ${scheme}`, () => {
        const tokens = effectiveTokens(theme.id, scheme);

        for (const [surface, text] of SURFACE_TEXT_PAIRS) {
          it(`${surface} / ${text} alcanza AA (>= ${WCAG_AA_NORMAL_TEXT}:1)`, () => {
            const surfaceValue = tokens.get(surface);
            const textValue = tokens.get(text);

            expect(surfaceValue, `${surface} no está declarado`).toBeDefined();
            expect(textValue, `${text} no está declarado`).toBeDefined();

            const surfaceColor = parseOklch(surfaceValue!);
            const textColor = parseOklch(textValue!);

            expect(surfaceColor, `${surface}: "${surfaceValue}" no es oklch()`).not.toBeNull();
            expect(textColor, `${text}: "${textValue}" no es oklch()`).not.toBeNull();

            const ratio = contrastRatio(surfaceColor!, textColor!);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
          });
        }
      });
    }
  }
});
