#!/usr/bin/env node
/**
 * Falla si un componente de src/ui contiene un color, radio o sombra
 * literal en lugar de una utilidad de Tailwind respaldada por un token
 * (ver theming: "Contrato de tokens semanticos").
 *
 * No es un linter de CSS de proposito general: solo busca los patrones que
 * un desarrollador escribiria por error en lugar de una clase de utilidad
 * -- estilos inline con color/radius/shadow, y valores hex/rgb/hsl/oklch
 * sueltos en className. Los propios archivos de tokens quedan excluidos.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const UI_ROOT = join(import.meta.dirname, "..", "src", "ui");

const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/;
const INLINE_STYLE_PROP = /style\s*=\s*\{\{[^}]*(color|background|border|boxShadow|borderRadius)/;

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      collectFiles(full, out);
    } else if ([".tsx", ".ts"].includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

function findViolations(path: string, source: string): string[] {
  const violations: string[] = [];

  source.split("\n").forEach((line, index) => {
    const lineNumber = index + 1;

    if (INLINE_STYLE_PROP.test(line)) {
      violations.push(`${path}:${lineNumber} — estilo inline con color, borde o sombra literal`);
    }

    const classNameMatch = line.match(/className\s*=\s*(\{[^}]*\}|"[^"]*"|'[^']*')/);
    if (classNameMatch && LITERAL_COLOR.test(classNameMatch[0])) {
      violations.push(`${path}:${lineNumber} — color literal dentro de className`);
    }
  });

  return violations;
}

let files: string[];
try {
  files = collectFiles(UI_ROOT);
} catch {
  console.log("No existe src/ui todavia; nada que verificar.");
  process.exit(0);
}

const violations = files.flatMap((file) => findViolations(file, readFileSync(file, "utf8")));

if (violations.length > 0) {
  console.error("Valores literales encontrados fuera del contrato de tokens:\n");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(
  `Contrato de tokens: ${files.length} archivo(s) verificado(s) en src/ui, sin valores literales.`
);
