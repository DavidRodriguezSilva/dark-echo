import type { AmbientDeclaration } from "./ambient";
import { rain } from "./ambients/rain";

/**
 * Catalogo de ambientes (procedural-ambiences, "Catalogo de ambientes
 * consultable"): unica fuente de verdad. El listado que expone la consola
 * se deriva de aqui, nunca se declara por separado.
 */
const AMBIENTS: AmbientDeclaration[] = [rain];

export function listAmbients(): { id: string; label: string }[] {
  return AMBIENTS.map(({ id, label }) => ({ id, label }));
}

export function findAmbient(id: string): AmbientDeclaration | undefined {
  return AMBIENTS.find((ambient) => ambient.id === id);
}
