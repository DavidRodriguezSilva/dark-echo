import type { DistanceModifierDeclaration } from "../modifier";

/**
 * `distancia`: el unico `Modifier` de esta entrega
 * (docs/synthesis-reference.md, `atenuacion-distancia`).
 *
 * Atenuacion y distancia son en la practica el mismo concepto
 * (`openspec/project.md`), asi que este `Modifier` los expresa juntos: el
 * nivel cae 6 dB por cada duplicacion de la distancia (ley del inverso del
 * cuadrado) y, a la vez, la absorcion atmosferica se lleva las frecuencias
 * altas -- por eso una fuente lejana no solo suena mas floja, suena
 * apagada.
 *
 * El rango llega hasta 200 m porque mas alla la absorcion atmosferica deja
 * la lluvia por debajo de los 400 Hz utiles y el resultado deja de ser
 * reconocible como lluvia.
 */
export const distancia: DistanceModifierDeclaration = {
  kind: "distance",
  id: "distancia",
  label: "Distancia",
  model: "atenuacion-distancia",
  minMeters: 1,
  maxMeters: 200,
  defaultMeters: 20,
};
