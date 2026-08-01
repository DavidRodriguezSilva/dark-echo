import { describe, expect, it } from "vitest";
import { autocomplete } from "./autocomplete";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor } from "./types";

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  const play: CommandDescriptor = {
    name: "play",
    aliases: [],
    description: "reproduce un ambiente",
    forms: [
      { args: [] },
      { args: [{ name: "ambiente", type: "enum", values: ["rain", "river"] }] },
    ],
    handler: () => ({ kind: "response", message: "" }),
  };

  const help: CommandDescriptor = {
    name: "help",
    aliases: ["?"],
    description: "ayuda",
    forms: [{ args: [] }],
    handler: () => ({ kind: "response", message: "" }),
  };

  const stop: CommandDescriptor = {
    name: "stop",
    aliases: [],
    description: "detiene",
    forms: [{ args: [] }],
    handler: () => ({ kind: "response", message: "" }),
  };

  registry.register(play);
  registry.register(help);
  registry.register(stop);
  return registry;
}

describe("autocomplete — nombres de comando", () => {
  it("completa cuando hay una unica coincidencia", () => {
    const result = autocomplete("pla", buildRegistry());
    expect(result).toEqual({ completed: "play", candidates: ["play"] });
  });

  it("lista candidatas y completa el prefijo comun cuando hay varias coincidencias", () => {
    const registry = buildRegistry();
    registry.register({
      name: "plant",
      aliases: [],
      description: "otro comando de prueba",
      forms: [{ args: [] }],
      handler: () => ({ kind: "response", message: "" }),
    });

    const result = autocomplete("pla", registry);
    expect(result.candidates.sort()).toEqual(["plant", "play"]);
    expect(result.completed).toBe("pla");
  });

  it("no altera la entrada si no hay ninguna coincidencia", () => {
    const result = autocomplete("xyz", buildRegistry());
    expect(result).toEqual({ completed: "xyz", candidates: [] });
  });
});

describe("autocomplete — valores de argumento", () => {
  it("completa el valor de un argumento enum con coincidencia unica", () => {
    const result = autocomplete("play ri", buildRegistry());
    expect(result).toEqual({ completed: "play river", candidates: ["river"] });
  });

  it("propone los valores admitidos cuando el argumento aun esta vacio", () => {
    const result = autocomplete("play ", buildRegistry());
    expect(result.candidates.sort()).toEqual(["rain", "river"]);
  });

  it("no completa argumentos de un comando sin valores enum en esa posicion", () => {
    const result = autocomplete("stop a", buildRegistry());
    expect(result).toEqual({ completed: "stop a", candidates: [] });
  });
});
