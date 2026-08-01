/**
 * OKLCH -> luminancia relativa WCAG (theming, "Contraste verificado de
 * cada tema"). Se necesita convertir porque WCAG 2 opera en sRGB, no en
 * OKLCH -- una salvedad que se documenta explícitamente (ver
 * synthesis-reference y el propio tokens.contrast.test.ts).
 */

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** Extrae L, C, H de una cadena `oklch(L C H)` o `oklch(L C H / A)`. Ignora el canal alfa. */
export function parseOklch(value: string): Oklch | null {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.%]+)?\s*\)$/i);
  if (!match) return null;

  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/**
 * OKLCH -> RGB lineal (sin gamma). La luminancia relativa de WCAG se define
 * sobre componentes lineales, así que no hace falta codificar a sRGB con
 * gamma y luego deshacerlo: se usan directamente aquí.
 */
export function oklchToLinearSrgb({ l, c, h }: Oklch): { r: number; g: number; b: number } {
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ ** 3;
  const mCubed = m_ ** 3;
  const sCubed = s_ ** 3;

  return {
    r: 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed,
    g: -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed,
    b: -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Luminancia relativa WCAG a partir de OKLCH, con clamping si el color queda fuera de gama sRGB. */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = oklchToLinearSrgb(color);
  return 0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b);
}

/** Relación de contraste WCAG entre dos colores OKLCH (siempre >= 1). */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
