import { describe, expect, it } from "vitest";
import { sameScene, type Scene } from "./scene";

describe("sameScene", () => {
  it("dos escenas idénticas coinciden", () => {
    const a: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "cabana", occlusion: null };
    const b: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "cabana", occlusion: null };
    expect(sameScene(a, b)).toBe(true);
  });

  it("el orden de las claves no importa", () => {
    const a: Scene = { layers: { "rain.cuerpo": 0.5, "wind.cuerpo": 0.6 } };
    const b: Scene = { layers: { "wind.cuerpo": 0.6, "rain.cuerpo": 0.5 } };
    expect(sameScene(a, b)).toBe(true);
  });

  it("un volumen distinto rompe la coincidencia", () => {
    const a: Scene = { layers: { "rain.cuerpo": 0.5 } };
    const b: Scene = { layers: { "rain.cuerpo": 0.6 } };
    expect(sameScene(a, b)).toBe(false);
  });

  it("una capa de más o de menos rompe la coincidencia", () => {
    const a: Scene = { layers: { "rain.cuerpo": 0.5 } };
    const b: Scene = { layers: { "rain.cuerpo": 0.5, "wind.cuerpo": 0.6 } };
    expect(sameScene(a, b)).toBe(false);
  });

  it("environment/occlusion ausente equivale a null", () => {
    const a: Scene = { layers: {} };
    const b: Scene = { layers: {}, environment: null, occlusion: null };
    expect(sameScene(a, b)).toBe(true);
  });

  it("un recinto distinto rompe la coincidencia", () => {
    const a: Scene = { layers: {}, environment: "cabana" };
    const b: Scene = { layers: {}, environment: "casa" };
    expect(sameScene(a, b)).toBe(false);
  });

  it("los modifiers se comparan por valor", () => {
    const a: Scene = { layers: {}, modifiers: { rain: { id: "distancia", meters: 20 } } };
    const b: Scene = { layers: {}, modifiers: { rain: { id: "distancia", meters: 20 } } };
    expect(sameScene(a, b)).toBe(true);
  });

  it("un modifier con distinta distancia rompe la coincidencia", () => {
    const a: Scene = { layers: {}, modifiers: { rain: { id: "distancia", meters: 20 } } };
    const b: Scene = { layers: {}, modifiers: { rain: { id: "distancia", meters: 5 } } };
    expect(sameScene(a, b)).toBe(false);
  });

  it("cargar una escena y luego cambiar un componente dejan de coincidir, y recargarla vuelve a coincidir", () => {
    const saved: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "cabana" };
    const afterLoad: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "cabana" };
    expect(sameScene(afterLoad, saved)).toBe(true);

    const afterChange: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "casa" };
    expect(sameScene(afterChange, saved)).toBe(false);

    const reloaded: Scene = { layers: { "rain.cuerpo": 0.5 }, environment: "cabana" };
    expect(sameScene(reloaded, saved)).toBe(true);
  });
});
