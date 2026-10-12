import { describe, expect, it } from "vitest";
import { executeCommand } from "./executeCommand";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor } from "./types";

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  const play: CommandDescriptor = {
    name: "play",
    aliases: [],
    description: "reproduce un ambiente",
    forms: [{ args: [{ name: "ambiente", type: "enum", values: ["rain", "wind"] }] }],
    handler: (args) => ({ kind: "response", message: `reproduciendo ${args.ambiente}` }),
  };

  const help: CommandDescriptor = {
    name: "help",
    aliases: ["?"],
    description: "ayuda",
    forms: [{ args: [] }],
    handler: () => ({ kind: "response", message: "ayuda general" }),
  };

  registry.register(play);
  registry.register(help);
  return registry;
}

describe("executeCommand", () => {
  it("ejecuta un comando valido y devuelve su resultado", async () => {
    const result = await executeCommand("play rain", buildRegistry());
    expect(result).toEqual({ kind: "response", message: "reproduciendo rain" });
  });

  it("ejecuta un comando por su alias", async () => {
    const result = await executeCommand("?", buildRegistry());
    expect(result).toEqual({ kind: "response", message: "ayuda general" });
  });

  it("entrada vacia no ejecuta nada y no produce error", async () => {
    expect(await executeCommand("", buildRegistry())).toBeNull();
    expect(await executeCommand("   ", buildRegistry())).toBeNull();
  });

  it("comando desconocido produce un error con sugerencia por distancia de edicion", async () => {
    const result = await executeCommand("pla rain", buildRegistry());
    expect(result?.kind).toBe("error");
    expect(result?.message).toContain("pla");
    expect(result?.message).toContain("play");
  });

  it("argumento invalido produce un error accionable sin ejecutar el comando", async () => {
    const result = await executeCommand("play fuego", buildRegistry());
    expect(result?.kind).toBe("error");
    expect(result?.message).toContain("fuego");
  });

  it("reconoce el prefijo de acceso rapido", async () => {
    const result = await executeCommand("/play wind", buildRegistry());
    expect(result).toEqual({ kind: "response", message: "reproduciendo wind" });
  });
});

describe("comando timer", () => {
  function timerRegistry(calls: string[]): CommandRegistry {
    const registry = new CommandRegistry();
    registry.register({
      name: "timer",
      aliases: [],
      description: "temporizador",
      forms: [
        { args: [] },
        { args: [{ name: "duracion", type: "string" }] },
        {
          args: [
            { name: "accion", type: "enum", values: ["at"] },
            { name: "hora", type: "string" },
          ],
        },
      ],
      handler: (args) => {
        calls.push(JSON.stringify(args));
        return { kind: "response", message: "ok" };
      },
    });
    return registry;
  }

  it("acepta las tres formas", async () => {
    const calls: string[] = [];
    const registry = timerRegistry(calls);
    await executeCommand("timer", registry);
    await executeCommand("timer 30m", registry);
    await executeCommand("timer at 23:30", registry);
    expect(calls).toEqual(["{}", '{"duracion":"30m"}', '{"accion":"at","hora":"23:30"}']);
  });
});
