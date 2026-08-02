import { describe, expect, it } from "vitest";
import {
  AFFINITY_WARNING_THRESHOLD,
  affinityWarning,
  scoreOcclusionAgainstEnvironment,
} from "./compatibility";
import { cabana } from "./environments/cabana";
import { casa } from "./environments/casa";
import { campoAbierto } from "./environments/campoAbierto";
import { techoMadera } from "./occlusions/techoMadera";
import { ventanaVidrio } from "./occlusions/ventanaVidrio";

/**
 * Verifica la puntuacion de afinidad (capacidad `ambient-compatibility`) y,
 * en particular, la Decision D6: el eje es posicional/estructural, no la
 * coincidencia de material.
 */

describe("Decision D6 — afinidad posicional, no coincidencia de material", () => {
  it("vidrio en un entorno de concreto puntua alto pese al material distinto (tarea 4.7)", () => {
    const affinity = scoreOcclusionAgainstEnvironment(ventanaVidrio, casa);

    expect(affinity.missingSurfaces).toEqual([]);
    expect(affinity.score).toBeGreaterThan(AFFINITY_WARNING_THRESHOLD);
    expect(affinity.belowThreshold).toBe(false);
  });

  it("un techo sin estructura que lo sostenga puntua bajo (tarea 4.7)", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, campoAbierto);

    expect(affinity.missingSurfaces).toEqual(["techo"]);
    expect(affinity.score).toBeLessThan(AFFINITY_WARNING_THRESHOLD);
    expect(affinity.belowThreshold).toBe(true);
  });

  it("una oclusion sin ningun entorno activo tampoco tiene estructura que la sostenga", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, null);

    expect(affinity.missingSurfaces).toEqual(["techo"]);
    expect(affinity.belowThreshold).toBe(true);
  });

  it("la diferencia de material por si sola nunca baja la puntuacion", () => {
    // Misma superficie exigida presente en ambos entornos; el vidrio no
    // comparte material con ninguno de los dos y aun asi ambos superan el
    // umbral. Lo que decide es la estructura, no el material.
    const enCasa = scoreOcclusionAgainstEnvironment(ventanaVidrio, casa);
    const enCabana = scoreOcclusionAgainstEnvironment(ventanaVidrio, cabana);

    expect(enCasa.belowThreshold).toBe(false);
    expect(enCabana.belowThreshold).toBe(false);
  });
});

describe("Puntuacion por coincidencia de etiquetas", () => {
  it("un techo de madera en una cabana de madera puntua al maximo", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, cabana);
    expect(affinity.score).toBeCloseTo(1, 6);
  });

  it("un techo de madera en una casa urbana se sostiene, aunque sus rasgos encajen menos", () => {
    const enCabana = scoreOcclusionAgainstEnvironment(techoMadera, cabana);
    const enCasa = scoreOcclusionAgainstEnvironment(techoMadera, casa);

    // La estructura esta, asi que no advierte; pero puntua por debajo de la
    // cabana, que es donde un techo de madera es tipico.
    expect(enCasa.belowThreshold).toBe(false);
    expect(enCasa.score).toBeLessThan(enCabana.score);
  });
});

describe("Calibracion del umbral (tarea 6.2)", () => {
  it("compartir rasgos nunca compensa la falta de una superficie que sostenga la barrera", () => {
    // El termino blando vale como mucho 0.3, por debajo del umbral de 0.5:
    // ninguna combinacion sin estructura puede superarlo por muchos rasgos
    // que comparta.
    expect(AFFINITY_WARNING_THRESHOLD).toBeGreaterThan(0.3);
  });

  it("una barrera bien sostenida no advierte aunque no comparta ningun rasgo", () => {
    // El termino estructural vale 0.7 por si solo, por encima del umbral.
    expect(AFFINITY_WARNING_THRESHOLD).toBeLessThan(0.7);

    const sinRasgosComunes = scoreOcclusionAgainstEnvironment(
      { ...techoMadera, affinityTraits: [] },
      casa
    );
    expect(sinRasgosComunes.belowThreshold).toBe(false);
  });

  it("todas las combinaciones estructuralmente validas del catalogo quedan sobre el umbral", () => {
    const combinaciones = [
      [techoMadera, cabana],
      [techoMadera, casa],
      [ventanaVidrio, cabana],
      [ventanaVidrio, casa],
    ] as const;

    for (const [occlusion, environment] of combinaciones) {
      const affinity = scoreOcclusionAgainstEnvironment(occlusion, environment);
      expect(affinity.belowThreshold).toBe(false);
    }
  });
});

describe("Mensaje de advertencia", () => {
  it("no hay advertencia cuando la afinidad es alta", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, cabana);
    expect(affinityWarning(techoMadera, cabana, affinity)).toBeNull();
  });

  it("la advertencia nombra la superficie que falta", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, campoAbierto);
    const warning = affinityWarning(techoMadera, campoAbierto, affinity);

    expect(warning).toContain("techo");
    expect(warning).toContain("campo-abierto");
  });

  it("la advertencia deja claro que la combinacion se aplica igualmente", () => {
    const affinity = scoreOcclusionAgainstEnvironment(techoMadera, campoAbierto);
    const warning = affinityWarning(techoMadera, campoAbierto, affinity);

    expect(warning).toContain("Se activa igualmente");
  });
});
