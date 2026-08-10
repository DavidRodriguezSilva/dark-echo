/**
 * Declaracion de un `Modifier` (capacidad `ambient-modifiers`): parametro
 * dinamico propio de un `Source` activo, no de la escena (design.md D3).
 *
 * La intensidad **no** aparece aqui, y no es un descuido: es una
 * caracteristica propia del `Source`, sin excepcion (design.md D4,
 * `openspec/project.md`). Lo que si es un `Modifier` es la distancia, que en
 * la practica es el mismo concepto que la atenuacion.
 */

export interface DistanceModifierDeclaration {
  kind: "distance";
  id: string;
  label: string;
  /** Identificador del modelo en docs/synthesis-reference.md. */
  model: string;
  /** Distancia minima declarada, en m: la posicion "encima" de la fuente. */
  minMeters: number;
  /** Distancia maxima declarada, en m. */
  maxMeters: number;
  /** Distancia con la que arranca el `Modifier` al activarse, en m. */
  defaultMeters: number;
}

export type ModifierDeclaration = DistanceModifierDeclaration;
