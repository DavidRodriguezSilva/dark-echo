import type { CommandRegistry } from "./registry";

/**
 * Autocompletado (command-console, "Autocompletado y sugerencias"): funcion
 * pura, sin efectos — el resultado se usa tanto para completar bajo demanda
 * (Tab) como para sugerencias en vivo (mostrar `candidates` sin tocar lo
 * escrito hasta que el usuario acepte `completed`).
 */
export interface AutocompleteResult {
  /** Texto resultante de aplicar el autocompletado (coincidencia unica, o el prefijo comun de varias). */
  completed: string;
  /** Coincidencias encontradas; longitud 1 si la coincidencia es unica. */
  candidates: string[];
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

export function autocomplete(input: string, registry: CommandRegistry): AutocompleteResult {
  const parts = input.split(/\s+/).filter(Boolean);
  const endsWithSpace = /\s$/.test(input);

  if (parts.length === 0) {
    return { completed: input, candidates: [] };
  }

  // Completando el nombre del comando: sin espacio final y sin argumentos aun.
  if (parts.length === 1 && !endsWithSpace) {
    const prefix = parts[0];
    const names = registry.list().flatMap((d) => [d.name, ...d.aliases]);
    const matches = names.filter((name) => name.startsWith(prefix));

    if (matches.length === 0) return { completed: input, candidates: [] };
    if (matches.length === 1) return { completed: matches[0], candidates: matches };
    return { completed: commonPrefix(matches), candidates: matches };
  }

  // Completando un valor de argumento.
  const [commandName, ...args] = parts;
  const descriptor = registry.find(commandName);
  if (!descriptor) return { completed: input, candidates: [] };

  const argIndex = endsWithSpace ? args.length : args.length - 1;
  const partial = endsWithSpace ? "" : (args[argIndex] ?? "");
  const precedingTokens = endsWithSpace ? args : args.slice(0, argIndex);

  const candidateValues = new Set<string>();
  for (const form of descriptor.forms) {
    const spec = form.args[argIndex];
    if (spec?.type === "enum" && spec.values) {
      for (const value of spec.values) {
        if (value.startsWith(partial)) candidateValues.add(value);
      }
    }
  }

  const matches = [...candidateValues];
  if (matches.length === 0) return { completed: input, candidates: [] };

  const completedArg = matches.length === 1 ? matches[0] : commonPrefix(matches);
  const completed = [commandName, ...precedingTokens, completedArg].join(" ");

  return { completed, candidates: matches };
}
