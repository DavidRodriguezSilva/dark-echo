import type { PerBand } from "../../dsp/acoustics";

/**
 * Declaracion de un `Environment` (capacidad `ambient-environment`): el bus
 * compartido de escena que colorea a cualquier `Source` que suene a traves
 * de el. Como el resto del catalogo, es *datos*: no contiene logica ni
 * coeficientes, solo las magnitudes fisicas de las que el runtime deriva su
 * grafo (design.md D2).
 */

/**
 * Superficie estructural que un entorno contiene de forma plausible
 * (capacidad `ambient-environment`, "Un `Environment` declara las superficies
 * que lo componen"). Es la base sobre la que se evalua la afinidad
 * posicional/estructural de una `Occlusion` -- nunca la coincidencia de
 * material (design.md D6).
 */
export type StructuralSurface = "techo" | "pared" | "abertura" | "suelo";

/** Rasgo no estructural del entorno, para el termino blando de la puntuacion de afinidad. */
export type EnvironmentTrait = "construido" | "natural" | "rustico" | "urbano" | "abierto";

export interface EnvironmentDeclaration {
  id: string;
  label: string;
  /** Identificador del modelo en docs/synthesis-reference.md. */
  model: string;
  /** Volumen encerrado, en m3. Cero para un espacio sin recinto. */
  volumeCubicMeters: number;
  /** Superficie interior total expuesta, en m2. */
  surfaceAreaSquareMeters: number;
  /** Coeficiente de absorcion por banda, adimensional en [0, 1]. */
  absorption: PerBand;
  /**
   * Fraccion de la senal que se escucha por el campo reverberante, en [0, 1].
   * Para un `Source` exterior que entra al recinto a traves de su envolvente,
   * la llegada es difusa y esta fraccion es alta; para un espacio abierto es
   * practicamente nula.
   */
  reverberantFraction: number;
  surfaces: StructuralSurface[];
  traits: EnvironmentTrait[];
}
