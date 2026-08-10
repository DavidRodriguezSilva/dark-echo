/**
 * Gramatica de comandos declarativa (command-console, "Comandos con
 * argumentos validados"): cada comando declara su forma, y de esa
 * declaracion se derivan validacion, errores y ayuda.
 */

export type ArgType = "string" | "number" | "enum";

export interface ArgSpec {
  name: string;
  type: ArgType;
  /** Solo para type "enum": valores admitidos. */
  values?: readonly string[];
  /** Solo para type "number": rango admitido, inclusive. */
  range?: [number, number];
}

/** Una de las formas posibles de invocar un comando (aridad + tipos propios). */
export interface CommandForm {
  args: ArgSpec[];
}

export type ParsedArgs = Record<string, string | number>;

export type CommandResultKind = "response" | "error";

export interface CommandResult {
  kind: CommandResultKind;
  message: string;
  /** Efecto de UI que el comando produce ademas del mensaje (p. ej. "clear"). */
  effect?: "clear";
}

export interface CommandDescriptor {
  name: string;
  aliases: string[];
  description: string;
  forms: CommandForm[];
  handler: (args: ParsedArgs) => CommandResult | Promise<CommandResult>;
}
