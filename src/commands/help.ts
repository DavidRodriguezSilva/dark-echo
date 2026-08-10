import type { CommandDescriptor } from "./types";
import { usageString } from "./validate";

/** Ayuda general, derivada de los descriptores: no puede desincronizarse. */
export function generalHelp(descriptors: CommandDescriptor[]): string {
  return descriptors.map((d) => `${d.name} — ${d.description}`).join("\n");
}

/** Ayuda de un comando concreto: forma(s) de uso, descripcion y alias. */
export function commandHelp(descriptor: CommandDescriptor): string {
  const usages = descriptor.forms.map((form) => usageString(descriptor.name, form)).join(" | ");
  const aliases = descriptor.aliases.length > 0 ? ` (alias: ${descriptor.aliases.join(", ")})` : "";
  return `${descriptor.description}${aliases}\nUso: ${usages}`;
}
