import { listAmbients } from "../catalog";
import { findEnvironment, listEnvironments, listModifiers, listOcclusions } from "./catalog";
import { findOcclusion } from "./catalog";
import { scoreOcclusionAgainstEnvironment } from "./compatibility";

/**
 * Sugerencia contextual de composición (`command-console`, "Sugerencia
 * contextual de composición").
 *
 * Resuelve un problema concreto: la consola dejaba **ejecutar** comandos pero
 * no ayudaba a **descubrirlos**. Sin saberse de memoria qué recintos y qué
 * barreras existen, armar una escena era adivinar, y renombrar verbos no lo
 * arregla — solo cambia lo que hay que memorizar.
 *
 * Es una función de datos a datos: recibe qué está activo y devuelve qué se
 * ofrece. No toca Web Audio ni React, así que vive en `domain/` y se prueba en
 * Node, sin navegador. `commands/` la invoca y la formatea; `audio/` no la
 * conoce.
 */

/** Estado de la escena del que depende la sugerencia. */
export interface SceneState {
  sourceIds: string[];
  environmentId: string | null;
  occlusionId: string | null;
  /** Ids de `Source` que ya tienen un `Modifier` activo. */
  modifiedSourceIds?: string[];
}

export interface SuggestionOption {
  id: string;
  label: string;
  /**
   * `true` cuando la opción encaja con la escena activa. Solo lo llevan las
   * familias donde la afinidad está definida —hoy las barreras—; en el resto
   * es `undefined`, que no es lo mismo que `false`.
   */
  fits?: boolean;
  /** Por qué no encaja, cuando `fits` es `false`. */
  note?: string;
}

export interface SuggestionGroup {
  /** Orden literal que el usuario puede escribir, sin el argumento. */
  command: string;
  /** Qué representa el grupo, en una palabra. */
  title: string;
  options: SuggestionOption[];
  /** Cuando el grupo no se ofrece como lista de ids sino como valor libre. */
  hint?: string;
}

/**
 * Qué puede combinarse a continuación, dado lo que ya está activo.
 *
 * Dos reglas gobiernan qué se omite, y las dos existen para que la sugerencia
 * sea corta y por tanto se lea:
 *
 * - No se ofrece lo que ya está activo. El recinto vigente no se sugiere como
 *   si faltara, ni un `Source` que ya suena.
 * - No se ofrece lo que no tiene sentido todavía. Sin ningún `Source` activo,
 *   un `Modifier` no tiene sobre qué actuar, así que no se sugiere.
 *
 * Las opciones de baja afinidad **sí** se ofrecen, marcadas (design.md D6): si
 * el sistema las acepta, esconderlas contradiría la decisión de advertir sin
 * bloquear, y dejaría sin salida a quien quiere probar una barrera rara a
 * propósito.
 */
export function suggestNext(state: SceneState): SuggestionGroup[] {
  const groups: SuggestionGroup[] = [];
  const active = new Set(state.sourceIds);
  const environment = state.environmentId ? (findEnvironment(state.environmentId) ?? null) : null;

  // Sin nada sonando, lo único que tiene sentido es empezar por un sonido:
  // ofrecer recintos y barreras para una escena muda sería ruido.
  if (active.size === 0) {
    return [
      {
        command: "play",
        title: "sonidos",
        options: listAmbients().map(({ id, label }) => ({ id, label })),
      },
    ];
  }

  if (!state.environmentId) {
    groups.push({
      command: "compose environment",
      title: "recinto",
      options: listEnvironments().map(({ id, label }) => ({ id, label })),
    });
  }

  if (!state.occlusionId) {
    groups.push({
      command: "compose occlusion",
      title: "barrera",
      options: listOcclusions().map(({ id, label }) => {
        const declaration = findOcclusion(id);
        if (!declaration) return { id, label };

        const affinity = scoreOcclusionAgainstEnvironment(declaration, environment);
        return {
          id,
          label,
          fits: !affinity.belowThreshold,
          note: affinity.belowThreshold
            ? affinity.missingSurfaces.length > 0
              ? `falta ${affinity.missingSurfaces.join(", ")}`
              : "poco afín"
            : undefined,
        };
      }),
    });
  }

  const modified = new Set(state.modifiedSourceIds ?? []);
  const sinModificar = state.sourceIds.filter((id) => !modified.has(id));
  if (sinModificar.length > 0 && listModifiers().length > 0) {
    groups.push({
      command: "compose distance",
      title: "distancia",
      options: sinModificar.map((id) => ({ id, label: id })),
      hint: "<sonido> <1-200 m>",
    });
  }

  const disponibles = listAmbients().filter(({ id }) => !active.has(id));
  if (disponibles.length > 0) {
    groups.push({
      command: "add",
      title: "más sonidos",
      options: disponibles.map(({ id, label }) => ({ id, label })),
    });
  }

  return groups;
}
