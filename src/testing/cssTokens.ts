/**
 * Parser minimo de bloques de tokens CSS (theming, "Contraste verificado de
 * cada tema"): extrae las declaraciones `--token: valor;` de un bloque para
 * poder verificarlas, sin anadir una dependencia de un parser de CSS
 * completo para un puñado de reglas conocidas y planas (sin anidamiento).
 */

export type TokenMap = Map<string, string>;

/** Declaraciones `--token: valor;` de un bloque de selector exacto (p. ej. ":root", "[data-theme=\"x\"].light"). */
export function extractBlock(css: string, selector: string): TokenMap {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // El selector no debe ir seguido de otro caracter de selector (evita que
  // ":root" case con ":root.light"): exige `{` (con espacio opcional) despues.
  const pattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "m");
  const match = css.match(pattern);
  const tokens: TokenMap = new Map();
  if (!match) return tokens;

  const body = match[1];
  const declarationPattern = /--([\w-]+)\s*:\s*([^;]+);/g;
  for (const declaration of body.matchAll(declarationPattern)) {
    tokens.set(`--${declaration[1]}`, declaration[2].trim());
  }
  return tokens;
}

/** Combina varios mapas en orden: cada uno sobreescribe al anterior (misma logica que la cascada CSS para estos bloques). */
export function mergeTokens(...maps: TokenMap[]): TokenMap {
  const merged: TokenMap = new Map();
  for (const map of maps) {
    for (const [key, value] of map) merged.set(key, value);
  }
  return merged;
}
