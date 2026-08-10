import { describe, expect, it } from "vitest";
import { commandHelp, generalHelp } from "./help";
import type { CommandDescriptor } from "./types";

const volumeCommand: CommandDescriptor = {
  name: "volume",
  aliases: [],
  description: "fija el volumen",
  forms: [
    { args: [{ name: "valor", type: "number" }] },
    {
      args: [
        { name: "capa", type: "string" },
        { name: "valor", type: "number" },
      ],
    },
  ],
  handler: () => ({ kind: "response", message: "" }),
};

const helpCommand: CommandDescriptor = {
  name: "help",
  aliases: ["?"],
  description: "muestra la ayuda",
  forms: [{ args: [] }],
  handler: () => ({ kind: "response", message: "" }),
};

describe("generalHelp", () => {
  it("lista cada comando con su descripcion, derivado de los descriptores", () => {
    const help = generalHelp([volumeCommand, helpCommand]);
    expect(help).toContain("volume — fija el volumen");
    expect(help).toContain("help — muestra la ayuda");
  });
});

describe("commandHelp", () => {
  it("muestra todas las formas de uso de un comando con varias formas", () => {
    const help = commandHelp(volumeCommand);
    expect(help).toContain("volume <valor>");
    expect(help).toContain("volume <capa> <valor>");
  });

  it("incluye los alias declarados", () => {
    const help = commandHelp(helpCommand);
    expect(help).toContain("alias: ?");
  });
});
