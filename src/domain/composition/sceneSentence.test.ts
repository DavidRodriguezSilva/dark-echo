import { describe, expect, it } from "vitest";
import { sceneSentence, sceneSentenceShort, type SceneSentenceInput } from "./sceneSentence";

function scene(overrides: Partial<SceneSentenceInput> = {}): SceneSentenceInput {
  return { sources: [], environmentId: null, occlusionId: null, ...overrides };
}

describe("sceneSentence", () => {
  it("escena vacía dice que no suena nada e invita a empezar", () => {
    expect(sceneSentence(scene())).toBe("Silencio. Elige un sonido para empezar.");
  });

  it("un solo Source, sin nada más", () => {
    expect(sceneSentence(scene({ sources: [{ id: "rain", modifier: null }] }))).toBe("Lluvia.");
  });

  it("dos Source se unen con 'y'", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: null },
            { id: "wind", modifier: null },
          ],
        })
      )
    ).toBe("Lluvia y viento.");
  });

  it("tres Source usan coma y 'y' finales", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: null },
            { id: "wind", modifier: null },
            { id: "river", modifier: null },
          ],
        })
      )
    ).toBe("Lluvia, viento y río.");
  });

  it("distancia en un único Source", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: null },
            { id: "wind", modifier: { id: "distancia", distanceMeters: 20 } },
          ],
        })
      )
    ).toBe("Lluvia y viento, a 20 metros.");
  });

  it("distancia igual en varios Source no se repite", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: { id: "distancia", distanceMeters: 20 } },
            { id: "wind", modifier: { id: "distancia", distanceMeters: 20 } },
          ],
        })
      )
    ).toBe("Lluvia y viento, a 20 metros.");
  });

  it("distancia distinta en varios Source se nombra por sonido", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: { id: "distancia", distanceMeters: 20 } },
            { id: "wind", modifier: { id: "distancia", distanceMeters: 5 } },
          ],
        })
      )
    ).toBe("Lluvia y viento, lluvia a 20 metros y viento a 5 metros.");
  });

  it("barrera sola", () => {
    expect(
      sceneSentence(
        scene({ sources: [{ id: "rain", modifier: null }], occlusionId: "techo-madera" })
      )
    ).toBe("Lluvia, tras un techo de madera.");
  });

  it("recinto solo", () => {
    expect(
      sceneSentence(scene({ sources: [{ id: "rain", modifier: null }], environmentId: "cabana" }))
    ).toBe("Lluvia, dentro de una cabaña de madera.");
  });

  it("combinación completa: sonidos, distancia, barrera y recinto", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: null },
            { id: "wind", modifier: { id: "distancia", distanceMeters: 20 } },
          ],
          occlusionId: "techo-madera",
          environmentId: "cabana",
        })
      )
    ).toBe(
      "Lluvia y viento, a 20 metros, tras un techo de madera, dentro de una cabaña de madera."
    );
  });

  it("con más de tres Source, abrevia nombrando los tres primeros", () => {
    expect(
      sceneSentence(
        scene({
          sources: [
            { id: "rain", modifier: null },
            { id: "wind", modifier: null },
            { id: "river", modifier: null },
            { id: "ocean", modifier: null },
            { id: "white-noise", modifier: null },
          ],
        })
      )
    ).toBe("Lluvia, viento, río y 2 más.");
  });

  it("nunca contiene identificadores internos del motor", () => {
    const text = sceneSentence(
      scene({
        sources: [
          { id: "rain", modifier: { id: "distancia", distanceMeters: 20 } },
          { id: "wind", modifier: null },
        ],
        occlusionId: "techo-madera",
        environmentId: "cabana",
      })
    );

    for (const forbidden of [
      "rain",
      "wind",
      "techo-madera",
      "cabana",
      "rain.cuerpo",
      "distancia",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

describe("sceneSentenceShort", () => {
  it("escena vacía", () => {
    expect(sceneSentenceShort(scene())).toBe("Silencio.");
  });

  it("solo enumera qué suena, sin cláusulas de cómo suena", () => {
    expect(
      sceneSentenceShort(
        scene({
          sources: [
            { id: "rain", modifier: { id: "distancia", distanceMeters: 20 } },
            { id: "wind", modifier: null },
          ],
          occlusionId: "techo-madera",
          environmentId: "cabana",
        })
      )
    ).toBe("Lluvia y viento.");
  });
});
