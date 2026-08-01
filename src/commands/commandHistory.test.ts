import { describe, expect, it } from "vitest";
import { CommandHistory } from "./commandHistory";

describe("CommandHistory", () => {
  it("registra comandos y los recupera navegando hacia atras en orden inverso", () => {
    const history = new CommandHistory();
    history.push("play rain");
    history.push("stop");

    expect(history.navigateBack("")).toBe("stop");
    expect(history.navigateBack("")).toBe("play rain");
  });

  it("no duplica una entrada identica a la anterior consecutiva", () => {
    const history = new CommandHistory();
    history.push("stop");
    history.push("stop");

    expect(history.getEntries()).toEqual(["stop"]);
  });

  it("permite repetir una entrada si no es consecutiva", () => {
    const history = new CommandHistory();
    history.push("stop");
    history.push("play rain");
    history.push("stop");

    expect(history.getEntries()).toEqual(["stop", "play rain", "stop"]);
  });

  it("descarta las entradas mas antiguas al superar el maximo", () => {
    const history = new CommandHistory([], 3);
    history.push("a");
    history.push("b");
    history.push("c");
    history.push("d");

    expect(history.getEntries()).toEqual(["b", "c", "d"]);
  });

  it("navegar hacia atras sin historial no hace nada", () => {
    const history = new CommandHistory();
    expect(history.navigateBack("borrador")).toBeNull();
  });

  it("navegar hacia atras se detiene en la entrada mas antigua", () => {
    const history = new CommandHistory();
    history.push("a");
    history.push("b");

    history.navigateBack("");
    history.navigateBack("");
    // una tercera vez no deberia ir mas atras de la primera entrada
    expect(history.navigateBack("")).toBe("a");
  });

  it("navegar hacia adelante vuelve al borrador que se estaba escribiendo", () => {
    const history = new CommandHistory();
    history.push("play rain");

    history.navigateBack("mi borrador sin enviar");
    expect(history.navigateForward()).toBe("mi borrador sin enviar");
  });

  it("navegar hacia adelante sin haber navegado hacia atras no hace nada", () => {
    const history = new CommandHistory();
    history.push("play rain");
    expect(history.navigateForward()).toBeNull();
  });

  it("push reinicia la navegacion", () => {
    const history = new CommandHistory();
    history.push("a");
    history.push("b");
    history.navigateBack("");

    history.push("c");
    expect(history.navigateForward()).toBeNull();
    expect(history.navigateBack("")).toBe("c");
  });

  it("acepta entradas iniciales (para restaurar un historial persistido)", () => {
    const history = new CommandHistory(["play rain", "stop"]);
    expect(history.navigateBack("")).toBe("stop");
  });
});
