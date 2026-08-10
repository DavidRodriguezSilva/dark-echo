import type { EnvironmentDeclaration } from "./environment";
import type { OcclusionDeclaration } from "./occlusion";

/**
 * Puntuacion de afinidad (capacidad `ambient-compatibility`, design.md D5/D6).
 *
 * Por coincidencia de etiquetas, no por lista blanca de pares: el catalogo
 * crece declarando etiquetas en cada componente, sin tener que enumerar cada
 * combinacion posible. La puntuacion **nunca bloquea** -- solo decide si la
 * consola muestra una advertencia.
 *
 * El eje dominante es *posicional/estructural*, no de material (D6): lo que
 * pesa es si el entorno tiene una superficie del tipo que la barrera
 * representa entre el oyente y la fuente. Un vidrio en una casa de concreto
 * puntua alto porque la casa tiene aberturas, no porque vidrio y concreto se
 * parezcan -- de hecho no se parecen, y esa es justamente la razon de que
 * una ventana exista.
 */

/**
 * Peso del termino estructural. Domina deliberadamente: por si solo ya deja
 * cualquier combinacion sin sustento estructural por debajo del umbral,
 * independientemente de cuantos rasgos blandos compartan.
 */
const STRUCTURAL_WEIGHT = 0.7;

/** Peso del termino blando de rasgos (tipicidad del conjunto). */
const TRAIT_WEIGHT = 0.3;

/**
 * Umbral por debajo del cual la consola advierte. Calibrado contra el
 * catalogo real (tarea 6.2), no fijado a priori: se situa por encima de
 * `TRAIT_WEIGHT` (0.3) para que compartir rasgos no baste nunca a compensar
 * la falta de una superficie que sostenga la barrera, y por debajo de
 * `STRUCTURAL_WEIGHT` (0.7) para que una barrera bien sostenida no advierta
 * aunque sus rasgos no encajen del todo con el entorno.
 */
export const AFFINITY_WARNING_THRESHOLD = 0.5;

export interface AffinityScore {
  /** Puntuacion total en [0, 1]. */
  score: number;
  /** Superficies exigidas por la oclusion que el entorno no tiene. */
  missingSurfaces: string[];
  /** True cuando la puntuacion cae por debajo del umbral declarado. */
  belowThreshold: boolean;
}

/**
 * Afinidad entre una `Occlusion` y el `Environment` activo. Sin entorno
 * activo no hay estructura que sostenga ninguna barrera, asi que el termino
 * estructural es cero -- una oclusion al aire libre es exactamente el caso
 * de baja afinidad que la Decision D6 describe.
 */
export function scoreOcclusionAgainstEnvironment(
  occlusion: OcclusionDeclaration,
  environment: EnvironmentDeclaration | null
): AffinityScore {
  const available = new Set(environment?.surfaces ?? []);
  const missingSurfaces = occlusion.requiredSurfaces.filter((surface) => !available.has(surface));

  const required = occlusion.requiredSurfaces.length;
  const structural = required === 0 ? 1 : (required - missingSurfaces.length) / required;

  const traits = new Set(environment?.traits ?? []);
  const shared = occlusion.affinityTraits.filter((trait) => traits.has(trait)).length;
  const traitAffinity =
    occlusion.affinityTraits.length === 0 ? 0 : shared / occlusion.affinityTraits.length;

  const score = STRUCTURAL_WEIGHT * structural + TRAIT_WEIGHT * traitAffinity;

  return {
    score,
    missingSurfaces,
    belowThreshold: score < AFFINITY_WARNING_THRESHOLD,
  };
}

/**
 * Mensaje de advertencia para una combinacion de baja afinidad
 * (capacidad `command-console`, "Advertencia de compatibilidad no
 * bloqueante"). Devuelve `null` cuando no hay nada que advertir; quien llama
 * nunca debe usar esto para decidir si permite la operacion, solo para
 * decidir si informa.
 */
export function affinityWarning(
  occlusion: OcclusionDeclaration,
  environment: EnvironmentDeclaration | null,
  affinity: AffinityScore
): string | null {
  if (!affinity.belowThreshold) return null;

  const where = environment ? `"${environment.id}"` : "una escena sin entorno";
  if (affinity.missingSurfaces.length > 0) {
    return `Afinidad baja: ${where} no tiene ${affinity.missingSurfaces.join(", ")} que sostenga "${occlusion.id}". Se activa igualmente.`;
  }
  return `Afinidad baja entre "${occlusion.id}" y ${where}. Se activa igualmente.`;
}
