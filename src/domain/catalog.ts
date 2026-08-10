import type { AmbientDeclaration } from "./ambient";
import { rain } from "./ambients/rain";
import { wind } from "./ambients/wind";
import { river } from "./ambients/river";
import { ocean } from "./ambients/ocean";
import { whiteNoise } from "./ambients/whiteNoise";
import { pinkNoise } from "./ambients/pinkNoise";
import { brownNoise } from "./ambients/brownNoise";

/**
 * Catalogo de ambientes (procedural-ambiences, "Catalogo de ambientes
 * consultable"): unica fuente de verdad. El listado que expone la consola
 * se deriva de aqui, nunca se declara por separado.
 */
const AMBIENTS: AmbientDeclaration[] = [
  rain,
  wind,
  river,
  ocean,
  whiteNoise,
  pinkNoise,
  brownNoise,
];

export function listAmbients(): { id: string; label: string }[] {
  return AMBIENTS.map(({ id, label }) => ({ id, label }));
}

export function findAmbient(id: string): AmbientDeclaration | undefined {
  return AMBIENTS.find((ambient) => ambient.id === id);
}
