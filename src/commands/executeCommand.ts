import type { CommandRegistry } from "./registry";
import { parseInput } from "./parseInput";
import { validateForms } from "./validate";
import type { CommandResult } from "./types";

/**
 * Punto de entrada de la gramatica (command-console). Entrada vacia SHALL no
 * ejecutar nada y no producir error (se devuelve null; quien llama decide si
 * eso implica no tocar el historial ni la salida).
 */
export async function executeCommand(
  raw: string,
  registry: CommandRegistry
): Promise<CommandResult | null> {
  const parsed = parseInput(raw);
  if (!parsed) return null;

  const descriptor = registry.find(parsed.command);
  if (!descriptor) {
    const suggestions = registry.findClosest(parsed.command);
    const suggestionText =
      suggestions.length > 0
        ? ` ¿Quisiste decir: ${suggestions.map((s) => s.name).join(", ")}?`
        : "";
    return {
      kind: "error",
      message: `Comando "${parsed.command}" no reconocido.${suggestionText}`,
    };
  }

  const validation = validateForms(parsed.tokens, descriptor.forms, descriptor.name);
  if (!validation.ok) {
    return { kind: "error", message: validation.message };
  }

  return descriptor.handler(validation.args);
}
