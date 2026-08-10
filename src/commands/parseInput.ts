export interface ParsedInput {
  command: string;
  tokens: string[];
}

/** Prefijos de acceso rapido: equivalen a invocar sin prefijo (command-console). */
const QUICK_PREFIXES = ["/", "."];

/** Devuelve null en entrada vacia: no se ejecuta nada, no se registra, no hay error. */
export function parseInput(raw: string): ParsedInput | null {
  let text = raw.trim();
  if (text.length === 0) return null;

  for (const prefix of QUICK_PREFIXES) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
      break;
    }
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const [command, ...tokens] = parts;
  return { command: command.toLowerCase(), tokens };
}
