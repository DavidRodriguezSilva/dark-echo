import type { ArgSpec, CommandForm, ParsedArgs } from "./types";

export type ValidationResult = { ok: true; args: ParsedArgs } | { ok: false; message: string };

function validateToken(
  token: string,
  spec: ArgSpec
): { value: string | number } | { error: string } {
  switch (spec.type) {
    case "string":
      return { value: token };

    case "number": {
      const value = Number(token);
      if (Number.isNaN(value)) {
        return { error: `"${spec.name}" debe ser un número, no "${token}".` };
      }
      if (spec.range && (value < spec.range[0] || value > spec.range[1])) {
        return {
          error: `"${spec.name}" debe estar entre ${spec.range[0]} y ${spec.range[1]}.`,
        };
      }
      return { value };
    }

    case "enum": {
      if (!spec.values?.includes(token)) {
        return {
          error: `"${spec.name}" debe ser uno de: ${spec.values?.join(", ")}. Recibido: "${token}".`,
        };
      }
      return { value: token };
    }
  }
}

export function usageString(commandName: string, form: CommandForm): string {
  return [commandName, ...form.args.map((arg) => `<${arg.name}>`)].join(" ");
}

/**
 * Valida `tokens` contra las formas declaradas de un comando. Prueba las
 * formas cuya aridad coincide con el numero de tokens recibidos, en el
 * orden declarado, y usa la primera que valide sin error.
 */
export function validateForms(
  tokens: string[],
  forms: CommandForm[],
  commandName: string
): ValidationResult {
  const matchingArity = forms.filter((form) => form.args.length === tokens.length);

  if (matchingArity.length === 0) {
    const usages = forms.map((form) => usageString(commandName, form)).join(" | ");
    return {
      ok: false,
      message: `Número de argumentos incorrecto para "${commandName}". Uso: ${usages}`,
    };
  }

  let lastError = "Argumentos inválidos.";
  for (const form of matchingArity) {
    const args: ParsedArgs = {};
    let failed = false;

    for (let i = 0; i < form.args.length; i++) {
      const result = validateToken(tokens[i], form.args[i]);
      if ("error" in result) {
        lastError = result.error;
        failed = true;
        break;
      }
      args[form.args[i].name] = result.value;
    }

    if (!failed) return { ok: true, args };
  }

  return { ok: false, message: lastError };
}
