import { describe, expect, it } from "vitest";
import { parseInput } from "./parseInput";

describe("parseInput", () => {
  it("separa el comando de sus argumentos", () => {
    expect(parseInput("play rain")).toEqual({ command: "play", tokens: ["rain"] });
  });

  it("normaliza el nombre del comando a minusculas", () => {
    expect(parseInput("PLAY rain")).toEqual({ command: "play", tokens: ["rain"] });
  });

  it("tolera espacios repetidos entre tokens", () => {
    expect(parseInput("volume   rain   0.4")).toEqual({
      command: "volume",
      tokens: ["rain", "0.4"],
    });
  });

  it("devuelve null para una entrada vacia", () => {
    expect(parseInput("")).toBeNull();
    expect(parseInput("   ")).toBeNull();
  });

  it("reconoce el prefijo / como invocacion equivalente", () => {
    expect(parseInput("/play rain")).toEqual({ command: "play", tokens: ["rain"] });
  });

  it("reconoce el prefijo . como invocacion equivalente", () => {
    expect(parseInput(".stop")).toEqual({ command: "stop", tokens: [] });
  });

  it("un comando sin argumentos da un arreglo de tokens vacio", () => {
    expect(parseInput("status")).toEqual({ command: "status", tokens: [] });
  });
});
