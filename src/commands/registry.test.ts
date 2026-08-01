import { describe, expect, it } from "vitest";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor } from "./types";

function stubCommand(name: string, aliases: string[] = []): CommandDescriptor {
  return {
    name,
    aliases,
    description: `descripcion de ${name}`,
    forms: [{ args: [] }],
    handler: () => ({ kind: "response", message: "ok" }),
  };
}

describe("CommandRegistry", () => {
  it("encuentra un comando por su nombre", () => {
    const registry = new CommandRegistry();
    registry.register(stubCommand("play"));

    expect(registry.find("play")?.name).toBe("play");
  });

  it("encuentra un comando por alias", () => {
    const registry = new CommandRegistry();
    registry.register(stubCommand("help", ["?"]));

    expect(registry.find("?")?.name).toBe("help");
  });

  it("list() no duplica un comando con alias", () => {
    const registry = new CommandRegistry();
    registry.register(stubCommand("help", ["?", "h"]));
    registry.register(stubCommand("play"));

    expect(registry.list()).toHaveLength(2);
  });

  it("sugiere el comando mas proximo por distancia de edicion", () => {
    const registry = new CommandRegistry();
    registry.register(stubCommand("play"));
    registry.register(stubCommand("stop"));

    const suggestions = registry.findClosest("pla");
    expect(suggestions[0]?.name).toBe("play");
  });

  it("no sugiere nada si ningun comando esta razonablemente cerca", () => {
    const registry = new CommandRegistry();
    registry.register(stubCommand("play"));

    expect(registry.findClosest("xyzabc")).toEqual([]);
  });
});
