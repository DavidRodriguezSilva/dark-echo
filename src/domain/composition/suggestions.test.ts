import { describe, expect, it } from "vitest";
import { suggestNext } from "./suggestions";

/**
 * Sugerencia contextual (`retire-legacy-engine`, tarea 3.3). Funcion pura, asi
 * que se prueba en Node sin navegador — que es exactamente la razon de que
 * viva en `domain/` y no en `audio/`.
 */

function commandsOf(groups: ReturnType<typeof suggestNext>): string[] {
  return groups.map((group) => group.command);
}

describe("suggestNext — escena vacia", () => {
  it("solo ofrece empezar por un sonido", () => {
    const groups = suggestNext({ sourceIds: [], environmentId: null, occlusionId: null });

    expect(commandsOf(groups)).toEqual(["play"]);
  });

  it("ofrece el catalogo completo de ambientes", () => {
    const groups = suggestNext({ sourceIds: [], environmentId: null, occlusionId: null });

    expect(groups[0].options.map((o) => o.id)).toContain("rain");
    expect(groups[0].options).toHaveLength(7);
  });

  it("no ofrece recinto ni barrera sin nada sonando", () => {
    const groups = suggestNext({ sourceIds: [], environmentId: null, occlusionId: null });

    expect(commandsOf(groups)).not.toContain("compose environment");
    expect(commandsOf(groups)).not.toContain("compose occlusion");
  });
});

describe("suggestNext — con un Source sonando", () => {
  it("ofrece recinto, barrera, distancia y mas sonidos", () => {
    const groups = suggestNext({ sourceIds: ["rain"], environmentId: null, occlusionId: null });

    expect(commandsOf(groups)).toEqual([
      "compose environment",
      "compose occlusion",
      "compose distance",
      "add",
    ]);
  });

  it("no vuelve a ofrecer el Source que ya suena", () => {
    const groups = suggestNext({ sourceIds: ["rain"], environmentId: null, occlusionId: null });

    const add = groups.find((g) => g.command === "add")!;
    expect(add.options.map((o) => o.id)).not.toContain("rain");
    expect(add.options).toHaveLength(6);
  });

  it("la distancia se ofrece sobre el Source concreto", () => {
    const groups = suggestNext({
      sourceIds: ["rain", "wind"],
      environmentId: null,
      occlusionId: null,
    });

    const distance = groups.find((g) => g.command === "compose distance")!;
    expect(distance.options.map((o) => o.id)).toEqual(["rain", "wind"]);
  });

  it("no ofrece distancia sobre un Source que ya tiene Modifier", () => {
    const groups = suggestNext({
      sourceIds: ["rain", "wind"],
      environmentId: null,
      occlusionId: null,
      modifiedSourceIds: ["rain"],
    });

    const distance = groups.find((g) => g.command === "compose distance")!;
    expect(distance.options.map((o) => o.id)).toEqual(["wind"]);
  });
});

describe("suggestNext — no ofrece lo que ya esta activo", () => {
  it("con recinto activo, deja de ofrecer recinto", () => {
    const groups = suggestNext({
      sourceIds: ["rain"],
      environmentId: "cabana",
      occlusionId: null,
    });

    expect(commandsOf(groups)).not.toContain("compose environment");
    expect(commandsOf(groups)).toContain("compose occlusion");
  });

  it("con recinto y barrera activos, deja de ofrecer ambos", () => {
    const groups = suggestNext({
      sourceIds: ["rain"],
      environmentId: "cabana",
      occlusionId: "techo-madera",
    });

    expect(commandsOf(groups)).not.toContain("compose environment");
    expect(commandsOf(groups)).not.toContain("compose occlusion");
  });

  it("con todo el catalogo sonando, deja de ofrecer mas sonidos", () => {
    const groups = suggestNext({
      sourceIds: ["rain", "wind", "river", "ocean", "white-noise", "pink-noise", "brown-noise"],
      environmentId: "cabana",
      occlusionId: "techo-madera",
      modifiedSourceIds: [
        "rain",
        "wind",
        "river",
        "ocean",
        "white-noise",
        "pink-noise",
        "brown-noise",
      ],
    });

    expect(groups).toEqual([]);
  });
});

describe("suggestNext — afinidad marcada, no filtrada (design.md D6)", () => {
  it("en un recinto que no sostiene una barrera, la barrera se sigue ofreciendo", () => {
    const groups = suggestNext({
      sourceIds: ["rain"],
      environmentId: "campo-abierto",
      occlusionId: null,
    });

    const occlusion = groups.find((g) => g.command === "compose occlusion")!;
    // Se lista igual: el sistema advierte, no impide.
    expect(occlusion.options.map((o) => o.id)).toContain("techo-madera");
  });

  it("marca como no afin la barrera que el recinto no sostiene", () => {
    const groups = suggestNext({
      sourceIds: ["rain"],
      environmentId: "campo-abierto",
      occlusionId: null,
    });

    const techo = groups
      .find((g) => g.command === "compose occlusion")!
      .options.find((o) => o.id === "techo-madera")!;

    expect(techo.fits).toBe(false);
    expect(techo.note).toBeTruthy();
  });

  it("marca como afin la barrera que el recinto si sostiene", () => {
    const groups = suggestNext({
      sourceIds: ["rain"],
      environmentId: "cabana",
      occlusionId: null,
    });

    const techo = groups
      .find((g) => g.command === "compose occlusion")!
      .options.find((o) => o.id === "techo-madera")!;

    expect(techo.fits).toBe(true);
    expect(techo.note).toBeUndefined();
  });

  it("sin recinto activo ninguna barrera encaja, pero todas se ofrecen", () => {
    const groups = suggestNext({ sourceIds: ["rain"], environmentId: null, occlusionId: null });

    const occlusion = groups.find((g) => g.command === "compose occlusion")!;
    expect(occlusion.options).toHaveLength(3);
    expect(occlusion.options.every((o) => o.fits === false)).toBe(true);
  });
});
